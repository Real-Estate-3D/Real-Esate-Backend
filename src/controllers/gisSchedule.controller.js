// File: src/controllers/gisSchedule.controller.js
const { GISSchedule, Legislation, GISLayer } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

/**
 * Get all GIS schedules
 */
exports.getAll = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    scheduleType,
    legislationId,
    sortBy = 'display_order',
    sortOrder = 'ASC',
  } = req.query;

  const offset = (page - 1) * limit;

  // Build where clause
  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (scheduleType) where.schedule_type = scheduleType;
  if (legislationId) where.legislation_id = legislationId;

  const { count, rows } = await GISSchedule.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, sortOrder]],
    include: [
      {
        model: Legislation,
        as: 'legislation',
        attributes: ['id', 'title', 'number'],
      },
      {
        model: GISLayer,
        as: 'gisLayer',
        attributes: ['id', 'name', 'layer_type'],
      },
    ],
  });

  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
    },
  });
});

/**
 * Get GIS schedule by ID
 */
exports.getById = asyncHandler(async (req, res) => {
  const schedule = await GISSchedule.findByPk(req.params.id, {
    include: [
      {
        model: Legislation,
        as: 'legislation',
      },
      {
        model: GISLayer,
        as: 'gisLayer',
      },
    ],
  });

  if (!schedule) {
    throw new ApiError(404, 'GIS schedule not found');
  }

  res.json({
    success: true,
    data: schedule,
  });
});

/**
 * Create new GIS schedule
 */
exports.create = asyncHandler(async (req, res) => {
  const scheduleData = {
    ...req.body,
    created_by: req.user.id,
  };

  const schedule = await GISSchedule.create(scheduleData);

  res.status(201).json({
    success: true,
    message: 'GIS schedule created successfully',
    data: schedule,
  });
});

/**
 * Update GIS schedule
 */
exports.update = asyncHandler(async (req, res) => {
  const schedule = await GISSchedule.findByPk(req.params.id);

  if (!schedule) {
    throw new ApiError(404, 'GIS schedule not found');
  }

  await schedule.update(req.body);

  res.json({
    success: true,
    message: 'GIS schedule updated successfully',
    data: schedule,
  });
});

/**
 * Delete GIS schedule
 */
exports.delete = asyncHandler(async (req, res) => {
  const schedule = await GISSchedule.findByPk(req.params.id);

  if (!schedule) {
    throw new ApiError(404, 'GIS schedule not found');
  }

  // Delete associated file if exists
  if (schedule.file_path) {
    try {
      await fs.unlink(schedule.file_path);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  await schedule.destroy();

  res.json({
    success: true,
    message: 'GIS schedule deleted successfully',
  });
});

/**
 * Upload GIS file
 */
exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  const { legislationId, name, description, scheduleType } = req.body;

  if (!legislationId || !name) {
    // Clean up uploaded file
    await fs.unlink(req.file.path);
    throw new ApiError(400, 'Legislation ID and name are required');
  }

  const scheduleData = {
    legislation_id: legislationId,
    name,
    description,
    schedule_type: scheduleType || 'map_schedule',
    file_path: req.file.path,
    file_size: req.file.size,
    file_type: path.extname(req.file.originalname),
    created_by: req.user.id,
  };

  const schedule = await GISSchedule.create(scheduleData);

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: schedule,
  });
});

/**
 * Get schedules by legislation
 */
exports.getByLegislation = asyncHandler(async (req, res) => {
  const schedules = await GISSchedule.findAll({
    where: { legislation_id: req.params.legislationId },
    order: [['display_order', 'ASC']],
    include: [
      {
        model: GISLayer,
        as: 'gisLayer',
      },
    ],
  });

  res.json({
    success: true,
    data: schedules,
  });
});

/**
 * Get schedule types
 */
exports.getScheduleTypes = asyncHandler(async (req, res) => {
  const types = [
    { value: 'map_schedule', label: 'Map Schedule' },
    { value: 'zoning_schedule', label: 'Zoning Schedule' },
    { value: 'land_use', label: 'Land Use' },
    { value: 'height_density', label: 'Height & Density' },
    { value: 'parking', label: 'Parking' },
    { value: 'environmental', label: 'Environmental' },
    { value: 'heritage', label: 'Heritage' },
    { value: 'urban_design', label: 'Urban Design' },
    { value: 'other', label: 'Other' },
  ];

  res.json({
    success: true,
    data: types,
  });
});
