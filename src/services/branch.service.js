'use strict';

const { LegislationBranch, Legislation, ChangeHistory } = require('../models');

const VALID_SORT_COLUMNS = new Set(['created_at', 'updated_at', 'name', 'status']);

const parseSafeInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
};

const safeSortOrder = (val) => (String(val || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

const makeError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const formatBranch = (branch) => ({
  id:                  branch.id,
  name:                branch.name,
  description:         branch.description,
  status:              branch.status,
  isMain:              branch.is_main,
  parentBranchId:      branch.parent_branch_id,
  baseVersionId:       branch.base_version_id,
  mergedAt:            branch.merged_at,
  mergedBy:            branch.merged_by,
  mergedIntoBranchId:  branch.merged_into_branch_id,
  metadata:            branch.metadata,
  createdBy:           branch.created_by,
  createdAt:           branch.created_at,
  updatedAt:           branch.updated_at,
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/legislations/:legislationId/branches
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = async (legislationId, { page: rawPage, limit: rawLimit, status, sortBy = 'created_at', sortOrder = 'DESC' }) => {
  const page    = parseSafeInt(rawPage, 1);
  const limit   = parseSafeInt(rawLimit, 20);
  const orderBy = VALID_SORT_COLUMNS.has(sortBy) ? sortBy : 'created_at';
  const offset  = (page - 1) * limit;

  const where = { legislation_id: legislationId };
  if (status && status !== 'all') where.status = status;

  const { count, rows } = await LegislationBranch.findAndCountAll({
    where,
    order: [[orderBy, safeSortOrder(sortOrder)]],
    limit,
    offset,
  });

  return {
    data: rows.map(formatBranch),
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/legislations/:legislationId/branches/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = async (id) => {
  const branch = await LegislationBranch.findByPk(id, {
    include: [{ model: Legislation, as: 'legislation' }],
  });
  if (!branch) throw makeError(404, 'Branch not found');
  return branch;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/legislations/:legislationId/branches
// ─────────────────────────────────────────────────────────────────────────────

exports.create = async (legislationId, { name, description, parent_branch_id, base_version_id, metadata }, userId, userName) => {
  if (!String(name || '').trim()) throw makeError(400, 'name is required');

  const legislation = await Legislation.findByPk(legislationId);
  if (!legislation) throw makeError(404, 'Legislation not found');

  const branch = await LegislationBranch.create({
    legislation_id: legislationId,
    name,
    description,
    status:          'active',
    parent_branch_id,
    base_version_id,
    is_main:         false,
    metadata:        metadata || {},
    created_by:      userId,
  });

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Created new branch: ${name}`,
    change_type:       'created',
    legislation_id:    legislationId,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'branch', id: branch.id, title: name }],
  });

  return branch;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/legislations/:legislationId/branches/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.update = async (id, updates, userId, userName) => {
  const branch = await LegislationBranch.findByPk(id);
  if (!branch) throw makeError(404, 'Branch not found');

  const previousValues = branch.toJSON();

  await branch.update(updates);

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Updated branch: ${branch.name}`,
    change_type:       'updated',
    previous_values:   previousValues,
    new_values:        updates,
    legislation_id:    branch.legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'branch', id: branch.id, title: branch.name }],
  });

  return branch;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/legislations/:legislationId/branches/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.delete = async (id, userId, userName) => {
  const branch = await LegislationBranch.findByPk(id);
  if (!branch) throw makeError(404, 'Branch not found');

  if (branch.is_main) throw makeError(400, 'Cannot delete the main branch');

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Deleted branch: ${branch.name}`,
    change_type:       'deleted',
    previous_values:   branch.toJSON(),
    legislation_id:    branch.legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'branch', id, title: branch.name }],
  });

  await branch.destroy();
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/legislations/:legislationId/branches/:id/apply
// ─────────────────────────────────────────────────────────────────────────────

exports.applyBranch = async (id, apply, userId, userName) => {
  const branch = await LegislationBranch.findByPk(id);
  if (!branch) throw makeError(404, 'Branch not found');

  const metadata = { ...(branch.metadata || {}), isApplied: apply };
  await branch.update({ metadata });

  await ChangeHistory.create({
    date:              new Date(),
    description:       `${apply ? 'Applied' : 'Unapplied'} branch: ${branch.name}`,
    change_type:       'updated',
    legislation_id:    branch.legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'branch', id: branch.id, title: branch.name }],
  });

  return { branch, apply };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/legislations/:legislationId/branches/:id/merge
// ─────────────────────────────────────────────────────────────────────────────

exports.mergeBranch = async (id, target_branch_id, userId, userName) => {
  if (!target_branch_id) throw makeError(400, 'target_branch_id is required');

  const branch = await LegislationBranch.findByPk(id);
  if (!branch) throw makeError(404, 'Branch not found');

  const targetBranch = await LegislationBranch.findByPk(target_branch_id);
  if (!targetBranch) throw makeError(404, 'Target branch not found');

  await branch.update({
    status:               'merged',
    merged_at:            new Date(),
    merged_by:            userId,
    merged_into_branch_id: target_branch_id,
  });

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Merged branch "${branch.name}" into "${targetBranch.name}"`,
    change_type:       'updated',
    legislation_id:    branch.legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [
      { type: 'branch', id: branch.id,       title: branch.name,       action: 'merged_from' },
      { type: 'branch', id: targetBranch.id, title: targetBranch.name, action: 'merged_into' },
    ],
  });

  return branch;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/legislations/:legislationId/branches/timeline
// ─────────────────────────────────────────────────────────────────────────────

exports.getTimeline = async (legislationId) => {
  const branches = await LegislationBranch.findAll({
    where: { legislation_id: legislationId },
    order: [['created_at', 'ASC']],
  });

  return branches.map((branch) => ({
    id:         branch.id,
    name:       branch.name,
    isMain:     branch.is_main,
    status:     branch.status,
    startDate:  branch.created_at,
    endDate:    branch.merged_at || (branch.status === 'active' ? null : branch.updated_at),
    mergedInto: branch.merged_into_branch_id,
    isApplied:  branch.metadata?.isApplied || branch.is_main,
  }));
};
