'use strict';

const path = require('path');
const fs   = require('fs').promises;
const { Op } = require('sequelize');
const { GISSchedule, Legislation, GISLayer } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { extractGeometry, validateGeometryWithinJurisdiction } = require('../utils/jurisdictionValidation');

const SCHEDULE_TYPES = [
  { value: 'map_schedule',    label: 'Map Schedule' },
  { value: 'zoning_schedule', label: 'Zoning Schedule' },
  { value: 'land_use',        label: 'Land Use' },
  { value: 'height_density',  label: 'Height & Density' },
  { value: 'parking',         label: 'Parking' },
  { value: 'environmental',   label: 'Environmental' },
  { value: 'heritage',        label: 'Heritage' },
  { value: 'urban_design',    label: 'Urban Design' },
  { value: 'other',           label: 'Other' },
];

const parseSafeInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
};

// Geometry validation helper
const validateGeometry = async (geometry, userJurisdiction) => {
  const normalizedGeometry = extractGeometry(geometry);
  if (!normalizedGeometry) return null;

  if (!userJurisdiction) {
    throw new ApiError(422, 'User jurisdiction is required before saving polygon geometry');
  }

  const validation = await validateGeometryWithinJurisdiction({
    geometry:         normalizedGeometry,
    jurisdictionName: userJurisdiction,
  });

  if (!validation.valid) {
    throw new ApiError(422, validation.reason || 'Polygon is outside assigned jurisdiction');
  }

  return normalizedGeometry;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/gis-schedules
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = async ({
  page: rawPage,
  limit: rawLimit,
  search,
  scheduleType,
  legislationId,
  sortBy = 'created_at',
  sortOrder = 'ASC',
}) => {
  const page   = parseSafeInt(rawPage, 1);
  const limit  = parseSafeInt(rawLimit, 10);
  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { name:        { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (scheduleType)  where.schedule_type  = scheduleType;
  if (legislationId) where.legislation_id = legislationId;

  const { count, rows } = await GISSchedule.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortBy, sortOrder]],
    include: [
      { model: Legislation, as: 'legislation', attributes: ['id', 'title'] },
      { model: GISLayer,    as: 'layer',       attributes: ['id', 'name', 'layer_type'] },
    ],
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
// GET /api/v1/gis-schedules/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = async (id) => {
  const schedule = await GISSchedule.findByPk(id, {
    include: [
      { model: Legislation, as: 'legislation' },
      { model: GISLayer,    as: 'layer' },
    ],
  });
  if (!schedule) throw new ApiError(404, 'GIS schedule not found');
  return schedule;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/gis-schedules
// ─────────────────────────────────────────────────────────────────────────────

exports.create = async (body, { userId, userJurisdiction }) => {
  const normalizedGeometry = await validateGeometry(body?.geometry, userJurisdiction);

  const scheduleData = {
    ...body,
    ...(normalizedGeometry ? { geometry: normalizedGeometry } : {}),
    created_by: userId,
  };

  return GISSchedule.create(scheduleData);
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/gis-schedules/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.update = async (id, body, { userJurisdiction }) => {
  const schedule = await GISSchedule.findByPk(id);
  if (!schedule) throw new ApiError(404, 'GIS schedule not found');

  const updates = { ...body };
  const normalizedGeometry = await validateGeometry(body?.geometry, userJurisdiction);
  if (normalizedGeometry) updates.geometry = normalizedGeometry;

  await schedule.update(updates);
  return schedule;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/gis-schedules/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.delete = async (id) => {
  const schedule = await GISSchedule.findByPk(id);
  if (!schedule) throw new ApiError(404, 'GIS schedule not found');

  if (schedule.file_path) {
    try {
      await fs.unlink(schedule.file_path);
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  }

  await schedule.destroy();
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/gis-schedules/upload
// ─────────────────────────────────────────────────────────────────────────────

exports.uploadFile = async (file, { legislationId, name, description, scheduleType }, userId) => {
  if (!file) throw new ApiError(400, 'No file uploaded');

  if (!legislationId || !name) {
    await fs.unlink(file.path);
    throw new ApiError(400, 'Legislation ID and name are required');
  }

  return GISSchedule.create({
    legislation_id: legislationId,
    name,
    description,
    schedule_type:  scheduleType || 'map_schedule',
    file_path:      file.path,
    file_size:      file.size,
    file_type:      path.extname(file.originalname),
    created_by:     userId,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/gis-schedules/by-legislation/:legislationId
// ─────────────────────────────────────────────────────────────────────────────

exports.getByLegislation = async (legislationId) => {
  return GISSchedule.findAll({
    where:   { legislation_id: legislationId },
    order:   [['created_at', 'ASC']],
    include: [{ model: GISLayer, as: 'layer' }],
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/gis-schedules/types
// ─────────────────────────────────────────────────────────────────────────────

exports.getScheduleTypes = () => SCHEDULE_TYPES;
