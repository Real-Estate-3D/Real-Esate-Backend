const { Op } = require('sequelize');
const { Approval, ApprovalComment, ApprovalHistory, sequelize } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Misc helpers
// ─────────────────────────────────────────────────────────────────────────────

const normalizeEmail = (v) => String(v || '').trim().toLowerCase();
const isValidEmail   = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const getActorId   = (req) => req.user?.id   || null;
const getActorName = (req) => req.user?.firstName || req.user?.name || 'System';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory reviewer store  (will move to DB in a later step)
// ─────────────────────────────────────────────────────────────────────────────

let reviewers = [
  { id: 'rv-001', name: 'John Doe',    role: 'City Official',   email: 'john.doe@blueprint.gov' },
  { id: 'rv-002', name: 'Jane Smith',  role: 'Urban Planner',   email: 'jane.smith@blueprint.gov' },
  { id: 'rv-003', name: 'David Lee',   role: 'GIS Specialist',  email: 'david.lee@blueprint.gov' },
  { id: 'rv-004', name: 'Sofia Davis', role: 'Policy Reviewer', email: 'sofia.davis@blueprint.gov' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Response formatters
// DB stores snake_case; FE expects camelCase — transform here, not in the model
// ─────────────────────────────────────────────────────────────────────────────

const formatComment = (c) => {
  const o = c.toJSON ? c.toJSON() : c;
  return {
    id:        o.id,
    author:    o.author_name,
    role:      o.author_role || 'Reviewer',
    text:      o.text,
    createdAt: o.created_at,
  };
};

const formatHistory = (h) => {
  const o = h.toJSON ? h.toJSON() : h;
  return {
    id:        o.id,
    action:    o.action,
    actorName: o.actor_name,
    note:      o.note,
    createdAt: o.created_at,
  };
};

// Full approval shape — used by getById, create, and all action endpoints
const formatApproval = (record) => {
  const o = record.toJSON ? record.toJSON() : record;
  return {
    id:                    o.id,
    name:                  o.name,
    project:               o.project,
    applicant:             o.applicant,
    location:              o.location,
    description:           o.description,
    status:                o.status,
    submittedDate:         o.submitted_date,
    assignedReviewer:      o.assigned_reviewer,
    zoningInfo:            o.zoning_info            || {},
    legislationDetails:    o.legislation_details    || {},
    sitePlan:              o.site_plan              || {},
    legislativeCompliance: o.legislative_compliance || [],
    requiredStudies:       o.required_studies       || [],
    // DB column is workflow_steps; FE reads it as "workflow"
    workflow:              o.workflow_steps          || [],
    documents:             o.documents              || [],
    comments:              (o.comments || []).map(formatComment),
    history:               (o.history  || []).map(formatHistory),
    createdAt:             o.created_at,
    updatedAt:             o.updated_at,
  };
};

// Slim list shape — used by getAll (no heavy JSONB blobs)
const formatApprovalListItem = (record) => {
  const o = record.toJSON ? record.toJSON() : record;
  return {
    id:               o.id,
    name:             o.name,
    project:          o.project,
    applicant:        o.applicant,
    location:         o.location,
    description:      o.description,
    status:           o.status,
    submittedDate:    o.submitted_date,
    assignedReviewer: o.assigned_reviewer,
    updatedAt:        o.updated_at,
  };
};

// Reload a full approval with associated comments + history (ordered)
const loadFullApproval = (id) =>
  Approval.findByPk(id, {
    include: [
      { model: ApprovalComment, as: 'comments', order: [['created_at', 'ASC']] },
      { model: ApprovalHistory, as: 'history',  order: [['created_at', 'ASC']] },
    ],
  });

// Columns fetched in list queries
const LIST_ATTRIBUTES = [
  'id', 'name', 'project', 'applicant', 'location',
  'description', 'status', 'submitted_date', 'assigned_reviewer', 'updated_at',
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/approvals/meta/reviewers
// ─────────────────────────────────────────────────────────────────────────────

exports.getReviewers = asyncHandler(async (req, res) => {
  res.json({ success: true, data: reviewers });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/approvals/meta/reviewers
// ─────────────────────────────────────────────────────────────────────────────

exports.createReviewer = asyncHandler(async (req, res) => {
  const name  = String(req.body?.name  || '').trim();
  const role  = String(req.body?.role  || 'City Official').trim() || 'City Official';
  const email = normalizeEmail(req.body?.email);

  if (!name || !email)      throw new ApiError(400, 'name and email are required');
  if (!isValidEmail(email)) throw new ApiError(400, 'A valid email is required');

  if (reviewers.find((r) => normalizeEmail(r.email) === email)) {
    throw new ApiError(409, 'A reviewer with this email already exists');
  }

  const reviewer = { id: `rv-${Date.now()}`, name, role, email };
  reviewers = [reviewer, ...reviewers];

  res.status(201).json({ success: true, message: 'Reviewer added successfully', data: reviewer });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/approvals  — paginated list with search + status filter
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = asyncHandler(async (req, res) => {
  const page   = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit  = Math.max(parseInt(req.query.limit || '10', 10), 1);
  const search = (req.query.search || '').trim();
  const status = req.query.status || 'all';

  const where = {};

  if (status !== 'all') {
    where.status = status;
  }

  if (search) {
    where[Op.or] = [
      { name:        { [Op.iLike]: `%${search}%` } },
      { project:     { [Op.iLike]: `%${search}%` } },
      { applicant:   { [Op.iLike]: `%${search}%` } },
      { location:    { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Approval.findAndCountAll({
    where,
    attributes: LIST_ATTRIBUTES,
    order:  [['updated_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  res.json({
    success: true,
    data: rows.map(formatApprovalListItem),
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/approvals/:id  — full detail with comments + history
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = asyncHandler(async (req, res) => {
  const approval = await loadFullApproval(req.params.id);
  if (!approval) throw new ApiError(404, 'Approval not found');

  res.json({ success: true, data: formatApproval(approval) });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/approvals  — create new approval
// ─────────────────────────────────────────────────────────────────────────────

exports.create = asyncHandler(async (req, res) => {
  const {
    name,
    project,
    applicant,
    location,
    description,
    submittedDate,
    zoningInfo,
    requiredStudies,
    documents,
  } = req.body;

  if (!name || !applicant) {
    throw new ApiError(400, 'name and applicant are required');
  }

  const created = await sequelize.transaction(async (t) => {
    const approval = await Approval.create(
      {
        name,
        project:          project       || null,
        applicant,
        location:         location      || null,
        description:      description   || null,
        submitted_date:   submittedDate || new Date(),
        status:           'pending_review',
        zoning_info:      zoningInfo       || {},
        required_studies: requiredStudies  || [],
        documents:        documents        || [],
        created_by:       getActorId(req),
        updated_by:       getActorId(req),
      },
      { transaction: t }
    );

    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action:      'created',
        actor_id:    getActorId(req),
        actor_name:  getActorName(req),
        note:        'Approval submitted',
      },
      { transaction: t }
    );

    return approval.id;
  });

  // Reload with associations so the response includes the history entry
  const approval = await loadFullApproval(created);

  res.status(201).json({
    success: true,
    message: 'Approval created successfully',
    data:    formatApproval(approval),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/approvals/:id/approve
// ─────────────────────────────────────────────────────────────────────────────

exports.approve = asyncHandler(async (req, res) => {
  const approval = await Approval.findByPk(req.params.id);
  if (!approval) throw new ApiError(404, 'Approval not found');

  await sequelize.transaction(async (t) => {
    await approval.update(
      { status: 'approved', updated_by: getActorId(req) },
      { transaction: t }
    );
    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action:      'approved',
        actor_id:    getActorId(req),
        actor_name:  getActorName(req),
        note:        req.body?.reason || 'Application approved',
      },
      { transaction: t }
    );
  });

  const updated = await loadFullApproval(approval.id);
  res.json({ success: true, message: 'Approval approved successfully', data: formatApproval(updated) });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/approvals/:id/reject
// ─────────────────────────────────────────────────────────────────────────────

exports.reject = asyncHandler(async (req, res) => {
  const approval = await Approval.findByPk(req.params.id);
  if (!approval) throw new ApiError(404, 'Approval not found');

  if (!req.body?.reason?.trim()) {
    throw new ApiError(400, 'reason is required to reject an approval');
  }

  await sequelize.transaction(async (t) => {
    await approval.update(
      { status: 'rejected', updated_by: getActorId(req) },
      { transaction: t }
    );
    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action:      'rejected',
        actor_id:    getActorId(req),
        actor_name:  getActorName(req),
        note:        req.body.reason,
      },
      { transaction: t }
    );
  });

  const updated = await loadFullApproval(approval.id);
  res.json({ success: true, message: 'Approval rejected', data: formatApproval(updated) });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/approvals/:id/assign
// ─────────────────────────────────────────────────────────────────────────────

exports.assign = asyncHandler(async (req, res) => {
  const approval = await Approval.findByPk(req.params.id);
  if (!approval) throw new ApiError(404, 'Approval not found');

  // Accept either a full reviewer object or just a reviewerId to look up
  const reviewer =
    req.body?.reviewer ||
    reviewers.find((r) => r.id === req.body?.reviewerId) ||
    null;

  if (!reviewer) throw new ApiError(400, 'reviewer or reviewerId is required');

  await sequelize.transaction(async (t) => {
    await approval.update(
      {
        status:            'assigned',
        assigned_reviewer: { id: reviewer.id, name: reviewer.name, role: reviewer.role, email: reviewer.email },
        updated_by:        getActorId(req),
      },
      { transaction: t }
    );
    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action:      'assigned',
        actor_id:    getActorId(req),
        actor_name:  getActorName(req),
        note:        `Assigned to ${reviewer.name} (${reviewer.role || 'Reviewer'})`,
      },
      { transaction: t }
    );
  });

  const updated = await loadFullApproval(approval.id);
  res.json({ success: true, message: `Approval assigned to ${reviewer.name}`, data: formatApproval(updated) });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/approvals/:id/request-revision
// ─────────────────────────────────────────────────────────────────────────────

exports.requestRevision = asyncHandler(async (req, res) => {
  const approval = await Approval.findByPk(req.params.id);
  if (!approval) throw new ApiError(404, 'Approval not found');

  if (!req.body?.reason?.trim()) {
    throw new ApiError(400, 'reason is required to request a revision');
  }

  const { reason, deadline, recipient } = req.body;

  // Build a descriptive note from all the revision fields
  let note = reason;
  if (deadline) note += ` | Deadline: ${deadline}`;
  if (recipient?.name) note += ` | Recipient: ${recipient.name}`;

  await sequelize.transaction(async (t) => {
    await approval.update(
      { status: 'revision_requested', updated_by: getActorId(req) },
      { transaction: t }
    );
    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action:      'revision_requested',
        actor_id:    getActorId(req),
        actor_name:  getActorName(req),
        note,
      },
      { transaction: t }
    );
  });

  const updated = await loadFullApproval(approval.id);
  res.json({ success: true, message: 'Revision requested', data: formatApproval(updated) });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/approvals/:id/comments
// ─────────────────────────────────────────────────────────────────────────────

exports.addComment = asyncHandler(async (req, res) => {
  const approval = await Approval.findByPk(req.params.id);
  if (!approval) throw new ApiError(404, 'Approval not found');

  const text = req.body?.text?.trim();
  if (!text) throw new ApiError(400, 'Comment text is required');

  // author/role can come from the request body (FE sends them directly)
  // or fall back to the authenticated user
  const authorName =
    req.body?.author ||
    req.user?.display_name ||
    req.user?.firstName ||
    req.user?.name ||
    'System';

  await ApprovalComment.create({
    approval_id:  approval.id,
    author_id:    getActorId(req),
    author_name:  authorName,
    author_role:  req.body?.role || 'Reviewer',
    text,
  });

  // Return the full approval so the FE drawer refreshes all comments at once
  const updated = await loadFullApproval(approval.id);
  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data:    formatApproval(updated),
  });
});
