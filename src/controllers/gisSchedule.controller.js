// File: src/controllers/gisSchedule.controller.js
// HTTP layer only; business logic lives in gisSchedule.service.js
const gisScheduleService = require('../services/gisSchedule.service');
const asyncHandler       = require('../middleware/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const result = await gisScheduleService.getAll(req.query);
  res.json({ success: true, ...result });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await gisScheduleService.getById(req.params.id);
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await gisScheduleService.create(req.body, {
    userId:          req.user?.id          || null,
    userJurisdiction: req.user?.jurisdiction || null,
  });
  res.status(201).json({ success: true, message: 'GIS schedule created successfully', data });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await gisScheduleService.update(req.params.id, req.body, {
    userJurisdiction: req.user?.jurisdiction || null,
  });
  res.json({ success: true, message: 'GIS schedule updated successfully', data });
});

exports.delete = asyncHandler(async (req, res) => {
  await gisScheduleService.delete(req.params.id);
  res.json({ success: true, message: 'GIS schedule deleted successfully' });
});

exports.uploadFile = asyncHandler(async (req, res) => {
  const data = await gisScheduleService.uploadFile(
    req.file,
    req.body,
    req.user?.id || null
  );
  res.status(201).json({ success: true, message: 'File uploaded successfully', data });
});

exports.getByLegislation = asyncHandler(async (req, res) => {
  const data = await gisScheduleService.getByLegislation(req.params.legislationId);
  res.json({ success: true, data });
});

exports.getScheduleTypes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: gisScheduleService.getScheduleTypes() });
});
