'use strict';

const projectService = require('../services/project.service');
const asyncHandler   = require('../middleware/asyncHandler');

const getActorId   = (req) => req.user?.id || null;
const getActorName = (req) => req.user?.firstName || req.user?.name || 'System';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/projects/meta  — dropdown values for the create/edit form
// ─────────────────────────────────────────────────────────────────────────────

exports.getMeta = asyncHandler(async (req, res) => {
  res.json({ success: true, data: projectService.getMeta() });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/projects  — paginated list with search + filters
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = asyncHandler(async (req, res) => {
  const result = await projectService.getAll(req.query);

  res.json({ success: true, ...result });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/projects/:id  — full detail
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = asyncHandler(async (req, res) => {
  const data = await projectService.getById(req.params.id);
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/projects  — create
// ─────────────────────────────────────────────────────────────────────────────

exports.create = asyncHandler(async (req, res) => {
  const data = await projectService.create(req.body, getActorId(req), getActorName(req));

  res.status(201).json({ success: true, message: 'Project created successfully', data });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/projects/:id  — update (partial or full)
// ─────────────────────────────────────────────────────────────────────────────

exports.update = asyncHandler(async (req, res) => {
  const data = await projectService.update(
    req.params.id,
    req.body,
    getActorId(req),
    getActorName(req)
  );

  res.json({ success: true, message: 'Project updated successfully', data });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/projects/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.delete = asyncHandler(async (req, res) => {
  await projectService.delete(req.params.id);
  res.json({ success: true, message: 'Project deleted successfully' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/projects/:id/comments
// ─────────────────────────────────────────────────────────────────────────────

exports.addComment = asyncHandler(async (req, res) => {
  const authorName =
    req.body?.author      ||
    req.user?.display_name ||
    req.user?.firstName   ||
    req.user?.name        ||
    'System';

  const data = await projectService.addComment(
    req.params.id,
    { text: req.body?.text, authorName, authorRole: req.body?.role },
    getActorId(req)
  );

  res.status(201).json({ success: true, message: 'Comment added successfully', data });
});
