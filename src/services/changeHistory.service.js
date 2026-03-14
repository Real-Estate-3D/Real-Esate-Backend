'use strict';

const { Op } = require('sequelize');
const { ChangeHistory, Legislation, ZoningLaw } = require('../models');

const VALID_SORT_COLUMNS = new Set(['date', 'created_at', 'change_type']);

const parseSafeInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
};

const safeSortOrder = (val) => (String(val || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

const makeError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const formatHistory = (history) => ({
  id:               history.id,
  date:             history.date,
  description:      history.description,
  changeType:       history.change_type,
  affectedEntities: history.affected_entities || [],
  legislation:      history.legislation,
  zoningLaw:        history.zoningLaw,
  userName:         history.user_name,
  createdAt:        history.created_at,
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/change-history
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = async ({
  page: rawPage,
  limit: rawLimit,
  search,
  change_type,
  date_from,
  date_to,
  legislation_id,
  zoning_law_id,
  sortBy = 'date',
  sortOrder = 'DESC',
}) => {
  const page    = parseSafeInt(rawPage, 1);
  const limit   = parseSafeInt(rawLimit, 10);
  const orderBy = VALID_SORT_COLUMNS.has(sortBy) ? sortBy : 'date';
  const offset  = (page - 1) * limit;

  const where = {};
  if (search)                         where.description  = { [Op.iLike]: `%${search}%` };
  if (change_type && change_type !== 'all') where.change_type  = change_type;
  if (legislation_id)                 where.legislation_id = legislation_id;
  if (zoning_law_id)                  where.zoning_law_id  = zoning_law_id;

  if (date_from || date_to) {
    where.date = {};
    if (date_from) where.date[Op.gte] = date_from;
    if (date_to)   where.date[Op.lte] = date_to;
  }

  const { count, rows } = await ChangeHistory.findAndCountAll({
    where,
    order:   [[orderBy, safeSortOrder(sortOrder)]],
    limit,
    offset,
    include: [
      { model: Legislation, as: 'legislation', attributes: ['id', 'title'] },
      { model: ZoningLaw,   as: 'zoningLaw',   attributes: ['id', 'title', 'number'] },
    ],
  });

  return {
    data: rows.map(formatHistory),
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/change-history/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = async (id) => {
  const history = await ChangeHistory.findByPk(id, {
    include: [
      { model: Legislation, as: 'legislation' },
      { model: ZoningLaw,   as: 'zoningLaw' },
    ],
  });
  if (!history) throw makeError(404, 'Change history record not found');
  return history;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/change-history/legislation/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getByLegislation = async (id, { page: rawPage, limit: rawLimit }) => {
  const page   = parseSafeInt(rawPage, 1);
  const limit  = parseSafeInt(rawLimit, 20);
  const offset = (page - 1) * limit;

  const { count, rows } = await ChangeHistory.findAndCountAll({
    where:   { legislation_id: id },
    order:   [['date', 'DESC']],
    limit,
    offset,
    include: [{ model: ZoningLaw, as: 'zoningLaw', attributes: ['id', 'title', 'number'] }],
  });

  return {
    data: rows,
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/change-history/zoning-law/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getByZoningLaw = async (id, { page: rawPage, limit: rawLimit }) => {
  const page   = parseSafeInt(rawPage, 1);
  const limit  = parseSafeInt(rawLimit, 20);
  const offset = (page - 1) * limit;

  const { count, rows } = await ChangeHistory.findAndCountAll({
    where: { zoning_law_id: id },
    order: [['date', 'DESC']],
    limit,
    offset,
  });

  return {
    data: rows,
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};
