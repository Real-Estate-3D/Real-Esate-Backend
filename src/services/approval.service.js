"use strict";

const { Op } = require("sequelize");
const {
  Approval,
  ApprovalComment,
  ApprovalHistory,
  sequelize,
} = require("../models");
const { ApiError } = require("../middleware/errorHandler");

// ─────────────────────────────────────────────────────────────────────────────
// Misc helpers
// ─────────────────────────────────────────────────────────────────────────────

const normalizeEmail = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ─────────────────────────────────────────────────────────────────────────────
// In-memory reviewer store  (will move to DB in a later step)
// ─────────────────────────────────────────────────────────────────────────────

let reviewers = [
  {
    id: "rv-001",
    name: "John Doe",
    role: "City Official",
    email: "john.doe@blueprint.gov",
  },
  {
    id: "rv-002",
    name: "Jane Smith",
    role: "Urban Planner",
    email: "jane.smith@blueprint.gov",
  },
  {
    id: "rv-003",
    name: "David Lee",
    role: "GIS Specialist",
    email: "david.lee@blueprint.gov",
  },
  {
    id: "rv-004",
    name: "Sofia Davis",
    role: "Policy Reviewer",
    email: "sofia.davis@blueprint.gov",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Response formatters
// DB stores snake_case; FE expects camelCase — transform here, not in the model
// ─────────────────────────────────────────────────────────────────────────────

const formatComment = (c) => {
  const o = c.toJSON ? c.toJSON() : c;
  return {
    id: o.id,
    author: o.author_name,
    role: o.author_role || "Reviewer",
    text: o.text,
    createdAt: o.created_at,
  };
};

const formatHistory = (h) => {
  const o = h.toJSON ? h.toJSON() : h;
  return {
    id: o.id,
    action: o.action,
    actorName: o.actor_name,
    note: o.note,
    createdAt: o.created_at,
  };
};

// Full approval shape — used by getById, create, and all action endpoints
const formatApproval = (record) => {
  const o = record.toJSON ? record.toJSON() : record;
  return {
    id: o.id,
    name: o.name,
    project: o.project,
    applicant: o.applicant,
    location: o.location,
    description: o.description,
    status: o.status,
    submittedDate: o.submitted_date,
    assignedReviewer: o.assigned_reviewer,
    zoningInfo: o.zoning_info || {},
    legislationDetails: o.legislation_details || {},
    sitePlan: o.site_plan || {},
    legislativeCompliance: o.legislative_compliance || [],
    requiredStudies: o.required_studies || [],
    // DB column is workflow_steps; FE reads it as "workflow"
    workflow: o.workflow_steps || [],
    documents: o.documents || [],
    comments: (o.comments || []).map(formatComment),
    history: (o.history || []).map(formatHistory),
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
};

// Slim list shape — used by getAll (no heavy JSONB blobs)
const formatApprovalListItem = (record) => {
  const o = record.toJSON ? record.toJSON() : record;
  return {
    id: o.id,
    name: o.name,
    project: o.project,
    applicant: o.applicant,
    location: o.location,
    description: o.description,
    status: o.status,
    submittedDate: o.submitted_date,
    assignedReviewer: o.assigned_reviewer,
    updatedAt: o.updated_at,
  };
};

// Reload a full approval with associated comments + history (ordered)
const loadFullApproval = (id) =>
  Approval.findByPk(id, {
    include: [
      {
        model: ApprovalComment,
        as: "comments",
        order: [["created_at", "ASC"]],
      },
      { model: ApprovalHistory, as: "history", order: [["created_at", "ASC"]] },
    ],
  });

// Columns fetched in list queries
const LIST_ATTRIBUTES = [
  "id",
  "name",
  "project",
  "applicant",
  "location",
  "description",
  "status",
  "submitted_date",
  "assigned_reviewer",
  "updated_at",
];

// ─────────────────────────────────────────────────────────────────────────────
// Reviewer methods
// ─────────────────────────────────────────────────────────────────────────────

exports.getReviewers = () => reviewers;

exports.createReviewer = ({ name, role, email }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!name || !normalizedEmail)
    throw new ApiError(400, "name and email are required");
  if (!isValidEmail(normalizedEmail))
    throw new ApiError(400, "A valid email is required");

  if (reviewers.find((r) => normalizeEmail(r.email) === normalizedEmail)) {
    throw new ApiError(409, "A reviewer with this email already exists");
  }

  const reviewer = {
    id: `rv-${Date.now()}`,
    name: String(name).trim(),
    role: String(role || "City Official").trim() || "City Official",
    email: normalizedEmail,
  };

  reviewers = [reviewer, ...reviewers];
  return reviewer;
};

// ─────────────────────────────────────────────────────────────────────────────
// Approval methods
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = async ({ page, limit, search, status }) => {
  const where = {};

  if (status !== "all") {
    where.status = status;
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { project: { [Op.iLike]: `%${search}%` } },
      { applicant: { [Op.iLike]: `%${search}%` } },
      { location: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Approval.findAndCountAll({
    where,
    attributes: LIST_ATTRIBUTES,
    order: [["updated_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    data: rows.map(formatApprovalListItem),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  };
};

exports.getById = async (id) => {
  const approval = await loadFullApproval(id);
  if (!approval) throw new ApiError(404, "Approval not found");
  return formatApproval(approval);
};

exports.create = async (
  {
    name,
    project,
    applicant,
    location,
    description,
    submittedDate,
    zoningInfo,
    requiredStudies,
    documents,
  },
  actorId,
  actorName,
) => {
  if (!name || !applicant) {
    throw new ApiError(400, "name and applicant are required");
  }

  const createdId = await sequelize.transaction(async (t) => {
    const approval = await Approval.create(
      {
        name,
        project: project || null,
        applicant,
        location: location || null,
        description: description || null,
        submitted_date: submittedDate || new Date(),
        status: "pending_review",
        zoning_info: zoningInfo || {},
        required_studies: requiredStudies || [],
        documents: documents || [],
        created_by: actorId,
        updated_by: actorId,
      },
      { transaction: t },
    );

    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action: "created",
        actor_id: actorId,
        actor_name: actorName,
        note: "Approval submitted",
      },
      { transaction: t },
    );

    return approval.id;
  });

  // Reload with associations so the response includes the history entry
  const approval = await loadFullApproval(createdId);
  return formatApproval(approval);
};

exports.approve = async (id, actorId, actorName, reason) => {
  const approval = await Approval.findByPk(id);
  if (!approval) throw new ApiError(404, "Approval not found");

  await sequelize.transaction(async (t) => {
    await approval.update(
      { status: "approved", updated_by: actorId },
      { transaction: t },
    );
    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action: "approved",
        actor_id: actorId,
        actor_name: actorName,
        note: reason || "Application approved",
      },
      { transaction: t },
    );
  });

  const updated = await loadFullApproval(approval.id);
  return formatApproval(updated);
};

exports.reject = async (id, actorId, actorName, reason) => {
  const approval = await Approval.findByPk(id);
  if (!approval) throw new ApiError(404, "Approval not found");

  if (!reason?.trim()) {
    throw new ApiError(400, "reason is required to reject an approval");
  }

  await sequelize.transaction(async (t) => {
    await approval.update(
      { status: "rejected", updated_by: actorId },
      { transaction: t },
    );
    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action: "rejected",
        actor_id: actorId,
        actor_name: actorName,
        note: reason,
      },
      { transaction: t },
    );
  });

  const updated = await loadFullApproval(approval.id);
  return formatApproval(updated);
};

exports.resolveReviewer = (reviewerBody, reviewerId) =>
  reviewerBody || reviewers.find((r) => r.id === reviewerId) || null;

exports.assign = async (id, reviewer, actorId, actorName) => {
  const approval = await Approval.findByPk(id);
  if (!approval) throw new ApiError(404, "Approval not found");

  if (!reviewer) throw new ApiError(400, "reviewer or reviewerId is required");

  await sequelize.transaction(async (t) => {
    await approval.update(
      {
        status: "assigned",
        assigned_reviewer: {
          id: reviewer.id,
          name: reviewer.name,
          role: reviewer.role,
          email: reviewer.email,
        },
        updated_by: actorId,
      },
      { transaction: t },
    );
    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action: "assigned",
        actor_id: actorId,
        actor_name: actorName,
        note: `Assigned to ${reviewer.name} (${reviewer.role || "Reviewer"})`,
      },
      { transaction: t },
    );
  });

  const updated = await loadFullApproval(approval.id);
  return { data: formatApproval(updated), reviewerName: reviewer.name };
};

exports.requestRevision = async (
  id,
  { reason, deadline, recipient },
  actorId,
  actorName,
) => {
  const approval = await Approval.findByPk(id);
  if (!approval) throw new ApiError(404, "Approval not found");

  if (!reason?.trim()) {
    throw new ApiError(400, "reason is required to request a revision");
  }

  // Build a descriptive note from all the revision fields
  let note = reason;
  if (deadline) note += ` | Deadline: ${deadline}`;
  if (recipient?.name) note += ` | Recipient: ${recipient.name}`;

  await sequelize.transaction(async (t) => {
    await approval.update(
      { status: "revision_requested", updated_by: actorId },
      { transaction: t },
    );
    await ApprovalHistory.create(
      {
        approval_id: approval.id,
        action: "revision_requested",
        actor_id: actorId,
        actor_name: actorName,
        note,
      },
      { transaction: t },
    );
  });

  const updated = await loadFullApproval(approval.id);
  return formatApproval(updated);
};

exports.addComment = async (id, { text, authorName, authorRole }, actorId) => {
  const approval = await Approval.findByPk(id);
  if (!approval) throw new ApiError(404, "Approval not found");

  if (!text?.trim()) throw new ApiError(400, "Comment text is required");

  await ApprovalComment.create({
    approval_id: approval.id,
    author_id: actorId,
    author_name: authorName,
    author_role: authorRole || "Reviewer",
    text: text.trim(),
  });

  // Return the full approval so the FE drawer refreshes all comments at once
  const updated = await loadFullApproval(approval.id);
  return formatApproval(updated);
};
