'use strict';

const { Op } = require('sequelize');
const { ZoningLaw, ChangeHistory, GISSchedule } = require('../models');
const { extractGeometry, validateGeometryWithinJurisdiction } = require('../utils/jurisdictionValidation');

const VALID_SORT_COLUMNS = new Set(['updated_at', 'created_at', 'title', 'status', 'number', 'zone_code']);

const parseSafeInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
};

const safeSortOrder = (val) => (String(val || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

const makeError = (statusCode, message, extra = {}) =>
  Object.assign(new Error(message), { statusCode, ...extra });

const formatZoningLaw = (law) => ({
  id:             law.id,
  title:          law.title,
  number:         law.number,
  type:           law.type,
  effectiveFrom:  law.effective_from,
  validityStatus: law.validity_status,
  status:         law.status,
  zoneCode:       law.zone_code,
  zoneName:       law.zone_name,
  description:    law.description,
  parameters:     law.parameters,
  municipality:   law.municipality,
  jurisdiction:   law.jurisdiction,
  version:        law.version,
  createdAt:      law.created_at,
  updatedAt:      law.updated_at,
});

// ─────────────────────────────────────────────────────────────────────────────
// Geometry validation helper (shared by create and update)
// ─────────────────────────────────────────────────────────────────────────────

const validateGeometry = async (geometry, userJurisdiction) => {
  const normalizedGeometry = extractGeometry(geometry);
  if (!normalizedGeometry) return { normalizedGeometry: null };

  if (!userJurisdiction) {
    throw makeError(422, 'User jurisdiction is required before saving polygon geometry');
  }

  const validation = await validateGeometryWithinJurisdiction({
    geometry:         normalizedGeometry,
    jurisdictionName: userJurisdiction,
  });

  if (!validation.valid) {
    throw makeError(422, validation.reason, { validation });
  }

  return { normalizedGeometry };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/zoning-laws
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = async ({
  page: rawPage,
  limit: rawLimit,
  search,
  type,
  status,
  municipality,
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
      { title:     { [Op.iLike]: `%${search}%` } },
      { number:    { [Op.iLike]: `%${search}%` } },
      { zone_code: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (type         && type         !== 'all') where.type         = type;
  if (status       && status       !== 'all') where.status       = status;
  if (municipality)                           where.municipality = municipality;
  if (jurisdiction)                           where.jurisdiction = jurisdiction;

  const { count, rows } = await ZoningLaw.findAndCountAll({
    where,
    order:  [[orderBy, safeSortOrder(sortOrder)]],
    limit,
    offset,
  });

  return {
    data: rows.map(formatZoningLaw),
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/zoning-laws/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = async (id) => {
  const zoningLaw = await ZoningLaw.findByPk(id, {
    include: [
      { model: GISSchedule,   as: 'gisSchedules' },
      { model: ChangeHistory, as: 'changeHistory', limit: 10, order: [['date', 'DESC']] },
    ],
  });
  if (!zoningLaw) throw makeError(404, 'Zoning law not found');
  return zoningLaw;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/zoning-laws
// ─────────────────────────────────────────────────────────────────────────────

exports.create = async (
  { title, number, type = 'Residential', effective_from, effective_to, validity_status, status = 'Draft', zone_code, zone_name, description, full_text, parameters, geometry, municipality, jurisdiction, legislation_id },
  { userId, userJurisdiction, userName }
) => {
  if (!String(title || '').trim()) throw makeError(400, 'title is required');

  const { normalizedGeometry } = await validateGeometry(geometry, userJurisdiction);

  const zoningLaw = await ZoningLaw.create({
    title, number, type, effective_from, effective_to, validity_status, status,
    zone_code, zone_name, description, full_text, parameters,
    geometry:       normalizedGeometry || geometry,
    municipality,   jurisdiction,       legislation_id,
    version:        1,
    created_by:     userId,
  });

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Created new zoning law: ${title}`,
    change_type:       'created',
    zoning_law_id:     zoningLaw.id,
    legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'zoning_law', id: zoningLaw.id, title }],
  });

  return zoningLaw;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/zoning-laws/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.update = async (id, updates, { userId, userJurisdiction, userName }) => {
  const { normalizedGeometry } = await validateGeometry(updates.geometry, userJurisdiction);
  if (normalizedGeometry) updates = { ...updates, geometry: normalizedGeometry };

  const zoningLaw = await ZoningLaw.findByPk(id);
  if (!zoningLaw) throw makeError(404, 'Zoning law not found');

  const previousValues = zoningLaw.toJSON();

  await zoningLaw.update({ ...updates, updated_by: userId });

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Updated zoning law: ${zoningLaw.title}`,
    change_type:       'updated',
    previous_values:   previousValues,
    new_values:        updates,
    zoning_law_id:     zoningLaw.id,
    legislation_id:    zoningLaw.legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'zoning_law', id: zoningLaw.id, title: zoningLaw.title }],
  });

  return zoningLaw;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/zoning-laws/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.delete = async (id, userId, userName) => {
  const zoningLaw = await ZoningLaw.findByPk(id);
  if (!zoningLaw) throw makeError(404, 'Zoning law not found');

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Deleted zoning law: ${zoningLaw.title}`,
    change_type:       'deleted',
    previous_values:   zoningLaw.toJSON(),
    legislation_id:    zoningLaw.legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [{ type: 'zoning_law', id, title: zoningLaw.title }],
  });

  await zoningLaw.destroy();
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/zoning-laws/:id/duplicate
// ─────────────────────────────────────────────────────────────────────────────

exports.duplicate = async (id, userId, userName) => {
  const original = await ZoningLaw.findByPk(id);
  if (!original) throw makeError(404, 'Zoning law not found');

  const duplicate = await ZoningLaw.create({
    title:          `${original.title} (Copy)`,
    number:         `${original.number}-COPY`,
    type:           original.type,
    effective_from: null,
    effective_to:   null,
    validity_status: null,
    status:         'Draft',
    zone_code:      original.zone_code,
    zone_name:      original.zone_name,
    description:    original.description,
    full_text:      original.full_text,
    parameters:     original.parameters,
    geometry:       original.geometry,
    municipality:   original.municipality,
    jurisdiction:   original.jurisdiction,
    legislation_id: original.legislation_id,
    parent_id:      original.id,
    version:        1,
    created_by:     userId,
  });

  await ChangeHistory.create({
    date:              new Date(),
    description:       `Duplicated zoning law: ${original.title}`,
    change_type:       'created',
    zoning_law_id:     duplicate.id,
    legislation_id:    original.legislation_id,
    user_id:           userId,
    user_name:         userName,
    affected_entities: [
      { type: 'zoning_law', id: duplicate.id, title: duplicate.title },
      { type: 'zoning_law', id: original.id,  title: original.title, relation: 'duplicated_from' },
    ],
  });

  return duplicate;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/zoning-laws/zone-code/:code
// ─────────────────────────────────────────────────────────────────────────────

exports.getByZoneCode = async (code) => {
  return ZoningLaw.findAll({
    where: { zone_code: code },
    order: [['version', 'DESC']],
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/zoning-laws/municipality/:municipality
// ─────────────────────────────────────────────────────────────────────────────

exports.getByMunicipality = async (municipality) => {
  return ZoningLaw.findAll({
    where: { municipality: { [Op.iLike]: `%${municipality}%` } },
    order: [['title', 'ASC']],
  });
};
