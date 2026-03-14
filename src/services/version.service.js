'use strict';

const { LegislationVersion, Legislation, User } = require('../models');

const VALID_SORT_COLUMNS = new Set(['version_number', 'created_at', 'updated_at', 'status']);

const parseSafeInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
};

const safeSortOrder = (val) => (String(val || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

const makeError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const USER_INCLUDE = {
  model:    User,
  as:       'creator',
  attributes: ['id', 'name', 'email'],
  required: false,
};

const formatVersion = (v) => ({
  id:             v.id,
  legislationId:  v.legislation_id,
  versionNumber:  v.version_number,
  title:          v.title,
  content:        v.content,
  changesSummary: v.changes_summary,
  snapshot:       v.snapshot,
  status:         v.status,
  createdBy:      v.created_by,
  approvedBy:     v.approved_by,
  approvedAt:     v.approved_at,
  creator:        v.creator
    ? { id: v.creator.id, name: v.creator.name, email: v.creator.email }
    : null,
  createdAt:      v.created_at,
  updatedAt:      v.updated_at,
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/legislations/:legislationId/versions
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = async (legislationId, { page: rawPage, limit: rawLimit, sortBy = 'version_number', sortOrder = 'DESC' }) => {
  const page    = parseSafeInt(rawPage, 1);
  const limit   = parseSafeInt(rawLimit, 20);
  const orderBy = VALID_SORT_COLUMNS.has(sortBy) ? sortBy : 'version_number';
  const offset  = (page - 1) * limit;

  const legislation = await Legislation.findByPk(legislationId);
  if (!legislation) throw makeError(404, 'Legislation not found');

  const { count, rows } = await LegislationVersion.findAndCountAll({
    where:   { legislation_id: legislationId },
    order:   [[orderBy, safeSortOrder(sortOrder)]],
    limit,
    offset,
    include: [USER_INCLUDE],
  });

  return {
    data: rows.map(formatVersion),
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/legislations/:legislationId/versions/:versionId
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = async (versionId) => {
  const version = await LegislationVersion.findByPk(versionId, {
    include: [USER_INCLUDE],
  });
  if (!version) throw makeError(404, 'Version not found');
  return formatVersion(version);
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/legislations/:legislationId/versions
// ─────────────────────────────────────────────────────────────────────────────

exports.create = async (legislationId, { title, content, changes_summary }, userId) => {
  const legislation = await Legislation.findByPk(legislationId);
  if (!legislation) throw makeError(404, 'Legislation not found');

  const lastVersion = await LegislationVersion.findOne({
    where: { legislation_id: legislationId },
    order: [['version_number', 'DESC']],
  });
  const nextVersionNumber = lastVersion ? lastVersion.version_number + 1 : 1;

  const version = await LegislationVersion.create({
    legislation_id:  legislationId,
    version_number:  nextVersionNumber,
    title:           title   || legislation.title,
    content:         content || legislation.full_text,
    changes_summary,
    snapshot:        legislation.toJSON(),
    status:          'draft',
    created_by:      userId,
  });

  return {
    id:             version.id,
    legislationId:  version.legislation_id,
    versionNumber:  version.version_number,
    title:          version.title,
    content:        version.content,
    changesSummary: version.changes_summary,
    snapshot:       version.snapshot,
    status:         version.status,
    createdBy:      version.created_by,
    createdAt:      version.created_at,
  };
};
