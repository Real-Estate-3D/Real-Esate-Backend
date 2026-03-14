'use strict';

const { Op } = require('sequelize');
const { Legislation, ZoningLaw, Policy, ChangeHistory, Workflow } = require('../models');

const VALID_SORT_COLUMNS = new Set([
  'updated_at', 'created_at', 'title', 'status', 'effective_from', 'legislation_type',
]);

const parseSafeInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
};

const safeSortOrder = (val) => (String(val || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

const makeError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/legislations
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = async ({
  page: rawPage,
  limit: rawLimit,
  search,
  status,
  type,
  jurisdiction,
  sortBy = 'updated_at',
  sortOrder = 'DESC',
}) => {
  const page    = parseSafeInt(rawPage, 1);
  const limit   = parseSafeInt(rawLimit, 10);
  const orderBy = VALID_SORT_COLUMNS.has(sortBy) ? sortBy : 'updated_at';
  const offset  = (page - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { title:   { [Op.iLike]: `%${search}%` } },
      { process: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (status && status !== 'all')     where.status           = status;
  if (type   && type   !== 'all')     where.legislation_type = type;
  if (jurisdiction)                   where.jurisdiction     = jurisdiction;

  const { count, rows } = await Legislation.findAndCountAll({
    where,
    order: [[orderBy, safeSortOrder(sortOrder)]],
    limit,
    offset,
    include: [{ model: Workflow, as: 'workflow', attributes: ['id', 'name'] }],
  });

  const data = rows.map((leg) => ({
    id:              leg.id,
    title:           leg.title,
    process:         leg.process,
    status:          leg.status,
    effectiveFrom:   leg.effective_from,
    legislationType: leg.legislation_type,
    jurisdiction:    leg.jurisdiction,
    municipality:    leg.municipality,
    description:     leg.description,
    workflow:        leg.workflow,
    createdAt:       leg.created_at,
    updatedAt:       leg.updated_at,
  }));

  return {
    data,
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/legislations/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = async (id) => {
  const legislation = await Legislation.findByPk(id, {
    include: [
      { model: ZoningLaw,     as: 'zoningLaws' },
      { model: Policy,        as: 'policies' },
      { model: Workflow,      as: 'workflow' },
      { model: ChangeHistory, as: 'changeHistory', limit: 10, order: [['date', 'DESC']] },
    ],
  });
  if (!legislation) throw makeError(404, 'Legislation not found');
  return legislation;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/legislations
// ─────────────────────────────────────────────────────────────────────────────

exports.create = async (
  { title, process, status = 'draft', legislation_type, effective_from, effective_to, jurisdiction, municipality, description, full_text, workflow_id },
  userId,
  userName
) => {
  if (!String(title || '').trim()) throw makeError(400, 'title is required');

  const legislation = await Legislation.create({
    title, process, status, legislation_type, effective_from, effective_to,
    jurisdiction, municipality, description, full_text, workflow_id,
    created_by: userId,
  });

  await ChangeHistory.create({
    date:           new Date(),
    description:    `Created new legislation: ${title}`,
    change_type:    'created',
    legislation_id: legislation.id,
    user_id:        userId,
    user_name:      userName,
  });

  return legislation;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/legislations/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.update = async (id, updates, userId, userName) => {
  const legislation = await Legislation.findByPk(id);
  if (!legislation) throw makeError(404, 'Legislation not found');

  const previousValues = legislation.toJSON();

  await legislation.update({ ...updates, updated_by: userId });

  await ChangeHistory.create({
    date:            new Date(),
    description:     `Updated legislation: ${legislation.title}`,
    change_type:     'updated',
    previous_values: previousValues,
    new_values:      updates,
    legislation_id:  legislation.id,
    user_id:         userId,
    user_name:       userName,
  });

  return legislation;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/legislations/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.delete = async (id, userId, userName) => {
  const legislation = await Legislation.findByPk(id);
  if (!legislation) throw makeError(404, 'Legislation not found');

  await ChangeHistory.create({
    date:            new Date(),
    description:     `Deleted legislation: ${legislation.title}`,
    change_type:     'deleted',
    previous_values: legislation.toJSON(),
    user_id:         userId,
    user_name:       userName,
  });

  await legislation.destroy();
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/legislations/:id/publish
// ─────────────────────────────────────────────────────────────────────────────

exports.publish = async (id, userId, userName) => {
  const legislation = await Legislation.findByPk(id);
  if (!legislation) throw makeError(404, 'Legislation not found');

  await legislation.update({ status: 'active', updated_by: userId });

  await ChangeHistory.create({
    date:           new Date(),
    description:    `Published legislation: ${legislation.title}`,
    change_type:    'published',
    legislation_id: legislation.id,
    user_id:        userId,
    user_name:      userName,
  });

  return legislation;
};
