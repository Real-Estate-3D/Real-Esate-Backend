const { Op } = require('sequelize');
const { Project, ProjectComment, ProjectHistory, sequelize } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_TYPES = ['residential', 'commercial', 'mixed_use', 'industrial', 'institutional'];
const STATUS_VALUES = ['pending_review', 'in_progress', 'approved', 'rejected', 'revision_requested'];
const DOCUMENT_TYPES = ['site_plan', 'zoning_application', 'environmental_assessment', 'traffic_impact_study'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getActorId   = (req) => req.user?.id   || null;
const getActorName = (req) => req.user?.firstName || req.user?.name || 'System';

// ─────────────────────────────────────────────────────────────────────────────
// Response formatters — DB snake_case → FE camelCase
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

// Full project shape — used by getById, create, update
const formatProject = (record) => {
  const o = record.toJSON ? record.toJSON() : record;
  return {
    id:                      o.id,
    name:                    o.name,
    applicant:               o.applicant,
    projectType:             o.project_type,
    description:             o.description,
    location:                o.location,
    status:                  o.status,
    submittedDate:           o.submitted_date,
    parcelId:                o.parcel_id,
    parcelAddress:           o.parcel_address,
    proposedZoning:          o.proposed_zoning,
    useSiteSpecificZoning:   o.use_site_specific_zoning,
    zoningInfo:              o.zoning_info              || {},
    compliance:              o.compliance               || {},
    documents:               o.documents                || [],
    model3d:                 o.model_3d                 || {},
    legislativeChangeRequest: o.legislative_change_request || {},
    comments:                (o.comments || []).map(formatComment),
    history:                 (o.history  || []).map(formatHistory),
    createdAt:               o.created_at,
    updatedAt:               o.updated_at,
  };
};

// Slim shape — used by getAll (no heavy JSONB blobs)
const formatProjectListItem = (record) => {
  const o = record.toJSON ? record.toJSON() : record;
  return {
    id:           o.id,
    name:         o.name,
    applicant:    o.applicant,
    projectType:  o.project_type,
    location:     o.location,
    description:  o.description,
    status:       o.status,
    submittedDate: o.submitted_date,
    updatedAt:    o.updated_at,
  };
};

// Load full project with associations
const loadFullProject = (id) =>
  Project.findByPk(id, {
    include: [
      { model: ProjectComment, as: 'comments', order: [['created_at', 'ASC']] },
      { model: ProjectHistory, as: 'history',  order: [['created_at', 'ASC']] },
    ],
  });

// Columns selected for list queries
const LIST_ATTRIBUTES = [
  'id', 'name', 'applicant', 'project_type', 'location',
  'description', 'status', 'submitted_date', 'updated_at',
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/projects/meta  — dropdown values for the create/edit form
// (must be registered BEFORE /:id route)
// ─────────────────────────────────────────────────────────────────────────────

exports.getMeta = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      projectTypes:  PROJECT_TYPES,
      statusValues:  STATUS_VALUES,
      documentTypes: DOCUMENT_TYPES,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/projects  — paginated list with search + filters
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = asyncHandler(async (req, res) => {
  const page        = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit       = Math.max(parseInt(req.query.limit || '10', 10), 1);
  const search      = (req.query.search || '').trim();
  const status      = req.query.status       || 'all';
  const projectType = req.query.project_type || 'all';

  const where = {};

  if (status !== 'all')      where.status       = status;
  if (projectType !== 'all') where.project_type = projectType;

  if (search) {
    where[Op.or] = [
      { name:        { [Op.iLike]: `%${search}%` } },
      { applicant:   { [Op.iLike]: `%${search}%` } },
      { location:    { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Project.findAndCountAll({
    where,
    attributes: LIST_ATTRIBUTES,
    order:  [['updated_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  res.json({
    success: true,
    data: rows.map(formatProjectListItem),
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/projects/:id  — full detail
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = asyncHandler(async (req, res) => {
  const project = await loadFullProject(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');

  res.json({ success: true, data: formatProject(project) });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/projects  — create
// ─────────────────────────────────────────────────────────────────────────────

exports.create = asyncHandler(async (req, res) => {
  const {
    name,
    applicant,
    projectType,
    description,
    location,
    submittedDate,
    parcelId,
    parcelAddress,
    proposedZoning,
    useSiteSpecificZoning,
    zoningInfo,
    compliance,
    documents,
    model3d,
    legislativeChangeRequest,
  } = req.body;

  if (!name || !applicant) {
    throw new ApiError(400, 'name and applicant are required');
  }

  if (projectType && !PROJECT_TYPES.includes(projectType)) {
    throw new ApiError(400, `projectType must be one of: ${PROJECT_TYPES.join(', ')}`);
  }

  const createdId = await sequelize.transaction(async (t) => {
    const project = await Project.create(
      {
        name,
        applicant,
        project_type:               projectType              || null,
        description:                description              || null,
        location:                   location                 || null,
        submitted_date:             submittedDate            || new Date(),
        status:                     'pending_review',
        parcel_id:                  parcelId                 || null,
        parcel_address:             parcelAddress            || null,
        proposed_zoning:            proposedZoning           || null,
        use_site_specific_zoning:   useSiteSpecificZoning    || false,
        zoning_info:                zoningInfo               || {},
        compliance:                 compliance               || {},
        documents:                  documents                || [],
        model_3d:                   model3d                  || {},
        legislative_change_request: legislativeChangeRequest || {},
        created_by:                 getActorId(req),
        updated_by:                 getActorId(req),
      },
      { transaction: t }
    );

    await ProjectHistory.create(
      {
        project_id: project.id,
        action:     'created',
        actor_id:   getActorId(req),
        actor_name: getActorName(req),
        note:       'Project submitted',
      },
      { transaction: t }
    );

    return project.id;
  });

  const project = await loadFullProject(createdId);

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data:    formatProject(project),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/projects/:id  — update (partial or full)
// ─────────────────────────────────────────────────────────────────────────────

exports.update = asyncHandler(async (req, res) => {
  const project = await Project.findByPk(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');

  const {
    name,
    applicant,
    projectType,
    description,
    location,
    status,
    submittedDate,
    parcelId,
    parcelAddress,
    proposedZoning,
    useSiteSpecificZoning,
    zoningInfo,
    compliance,
    documents,
    model3d,
    legislativeChangeRequest,
  } = req.body;

  if (projectType && !PROJECT_TYPES.includes(projectType)) {
    throw new ApiError(400, `projectType must be one of: ${PROJECT_TYPES.join(', ')}`);
  }

  if (status && !STATUS_VALUES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${STATUS_VALUES.join(', ')}`);
  }

  // Build only the fields that were actually sent
  const patch = { updated_by: getActorId(req) };
  if (name               !== undefined) patch.name                       = name;
  if (applicant          !== undefined) patch.applicant                  = applicant;
  if (projectType        !== undefined) patch.project_type               = projectType;
  if (description        !== undefined) patch.description                = description;
  if (location           !== undefined) patch.location                   = location;
  if (status             !== undefined) patch.status                     = status;
  if (submittedDate      !== undefined) patch.submitted_date             = submittedDate;
  if (parcelId           !== undefined) patch.parcel_id                  = parcelId;
  if (parcelAddress      !== undefined) patch.parcel_address             = parcelAddress;
  if (proposedZoning     !== undefined) patch.proposed_zoning            = proposedZoning;
  if (useSiteSpecificZoning !== undefined) patch.use_site_specific_zoning = useSiteSpecificZoning;
  if (zoningInfo         !== undefined) patch.zoning_info                = zoningInfo;
  if (compliance         !== undefined) patch.compliance                 = compliance;
  if (documents          !== undefined) patch.documents                  = documents;
  if (model3d            !== undefined) patch.model_3d                   = model3d;
  if (legislativeChangeRequest !== undefined) patch.legislative_change_request = legislativeChangeRequest;

  // Determine what changed for the history note
  const changedFields = Object.keys(patch).filter((k) => k !== 'updated_by');
  const note = changedFields.length
    ? `Updated: ${changedFields.join(', ')}`
    : 'Project updated';

  // Determine action type based on status change
  let historyAction = 'updated';
  if (status === 'approved')            historyAction = 'approved';
  else if (status === 'rejected')       historyAction = 'rejected';
  else if (status === 'revision_requested') historyAction = 'revision_requested';

  await sequelize.transaction(async (t) => {
    await project.update(patch, { transaction: t });
    await ProjectHistory.create(
      {
        project_id: project.id,
        action:     historyAction,
        actor_id:   getActorId(req),
        actor_name: getActorName(req),
        note,
      },
      { transaction: t }
    );
  });

  const updated = await loadFullProject(project.id);
  res.json({
    success: true,
    message: 'Project updated successfully',
    data:    formatProject(updated),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/projects/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.delete = asyncHandler(async (req, res) => {
  const project = await Project.findByPk(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');

  // Comments and history are cascade-deleted via FK
  await project.destroy();

  res.json({ success: true, message: 'Project deleted successfully' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/projects/:id/comments
// ─────────────────────────────────────────────────────────────────────────────

exports.addComment = asyncHandler(async (req, res) => {
  const project = await Project.findByPk(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');

  const text = req.body?.text?.trim();
  if (!text) throw new ApiError(400, 'Comment text is required');

  const authorName =
    req.body?.author ||
    req.user?.display_name ||
    req.user?.firstName ||
    req.user?.name ||
    'System';

  await ProjectComment.create({
    project_id:  project.id,
    author_id:   getActorId(req),
    author_name: authorName,
    author_role: req.body?.role || 'Reviewer',
    text,
  });

  // Return full project so the FE can refresh comments in one shot
  const updated = await loadFullProject(project.id);
  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data:    formatProject(updated),
  });
});
