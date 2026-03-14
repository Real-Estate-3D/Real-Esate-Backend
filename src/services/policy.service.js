'use strict';

const { Op } = require('sequelize');
const { Policy, ChangeHistory } = require('../models');

const VALID_SORT_COLUMNS = new Set(['name', 'created_at', 'updated_at', 'status', 'category', 'effective_from']);

const parseSafeInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
};

const safeSortOrder = (val) => (String(val || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

const makeError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const formatPolicy = (policy) => ({
  id:           policy.id,
  name:         policy.name,
  category:     policy.category,
  rules:        policy.rules,
  fullText:     policy.full_text,
  parameters:   policy.parameters,
  status:       policy.status,
  effectiveFrom: policy.effective_from,
  effectiveTo:  policy.effective_to,
  jurisdiction: policy.jurisdiction,
  municipality: policy.municipality,
  version:      policy.version,
  createdAt:    policy.created_at,
  updatedAt:    policy.updated_at,
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/policies
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = async ({
  page: rawPage,
  limit: rawLimit,
  search,
  category,
  status,
  jurisdiction,
  sortBy = 'name',
  sortOrder = 'ASC',
}) => {
  const page    = parseSafeInt(rawPage, 1);
  const limit   = parseSafeInt(rawLimit, 10);
  const orderBy = VALID_SORT_COLUMNS.has(sortBy) ? sortBy : 'name';
  const offset  = (page - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { name:  { [Op.iLike]: `%${search}%` } },
      { rules: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (category    && category    !== 'all') where.category    = category;
  if (status      && status      !== 'all') where.status      = status;
  if (jurisdiction)                         where.jurisdiction = jurisdiction;

  const { count, rows } = await Policy.findAndCountAll({
    where,
    order:  [[orderBy, safeSortOrder(sortOrder)]],
    limit,
    offset,
  });

  return {
    data: rows.map(formatPolicy),
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/policies/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = async (id) => {
  const policy = await Policy.findByPk(id);
  if (!policy) throw makeError(404, 'Policy not found');
  return policy;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/policies
// ─────────────────────────────────────────────────────────────────────────────

exports.create = async (
  { name, category, rules, full_text, parameters, status = 'active', effective_from, effective_to, jurisdiction, municipality, legislation_id },
  userId,
  userName
) => {
  if (!String(name || '').trim()) throw makeError(400, 'name is required');

  const policy = await Policy.create({
    name, category, rules, full_text, parameters, status,
    effective_from, effective_to, jurisdiction, municipality,
    legislation_id,
    version:    1,
    created_by: userId,
  });

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Created new policy: ${name}`,
    change_type:       'created',
    policy_id:         policy.id,
    legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'policy', id: policy.id, title: name }],
  });

  return policy;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/policies/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.update = async (id, updates, userId, userName) => {
  const policy = await Policy.findByPk(id);
  if (!policy) throw makeError(404, 'Policy not found');

  const previousValues = policy.toJSON();

  await policy.update({ ...updates, updated_by: userId });

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Updated policy: ${policy.name}`,
    change_type:       'updated',
    previous_values:   previousValues,
    new_values:        updates,
    policy_id:         policy.id,
    legislation_id:    policy.legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'policy', id: policy.id, title: policy.name }],
  });

  return policy;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/policies/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.delete = async (id, userId, userName) => {
  const policy = await Policy.findByPk(id);
  if (!policy) throw makeError(404, 'Policy not found');

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Deleted policy: ${policy.name}`,
    change_type:       'deleted',
    previous_values:   policy.toJSON(),
    legislation_id:    policy.legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'policy', id, title: policy.name }],
  });

  await policy.destroy();
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/policies/categories
// ─────────────────────────────────────────────────────────────────────────────

exports.getCategories = async () => {
  const categories = await Policy.findAll({
    attributes: ['category'],
    group:      ['category'],
    raw:        true,
  });
  return categories.map((c) => c.category);
};
