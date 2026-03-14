"use strict";

const approvalService = require("../services/approval.service");
const asyncHandler = require("../middleware/asyncHandler");

const getActorId = (req) => req.user?.id || null;
const getActorName = (req) => req.user?.firstName || req.user?.name || "System";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/approvals/meta/reviewers
// ─────────────────────────────────────────────────────────────────────────────

exports.getReviewers = asyncHandler(async (req, res) => {
  res.json({ success: true, data: approvalService.getReviewers() });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/approvals/meta/reviewers
// ─────────────────────────────────────────────────────────────────────────────

exports.createReviewer = asyncHandler(async (req, res) => {
  const reviewer = approvalService.createReviewer({
    name: req.body?.name,
    role: req.body?.role,
    email: req.body?.email,
  });

  res
    .status(201)
    .json({
      success: true,
      message: "Reviewer added successfully",
      data: reviewer,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/approvals  — paginated list with search + status filter
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);
  const search = (req.query.search || "").trim();
  const status = req.query.status || "all";

  const result = await approvalService.getAll({ page, limit, search, status });

  res.json({ success: true, ...result });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/approvals/:id  — full detail with comments + history
// ─────────────────────────────────────────────────────────────────────────────

exports.getById = asyncHandler(async (req, res) => {
  const data = await approvalService.getById(req.params.id);
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/approvals  — create new approval
// ─────────────────────────────────────────────────────────────────────────────

exports.create = asyncHandler(async (req, res) => {
  const data = await approvalService.create(
    req.body,
    getActorId(req),
    getActorName(req),
  );

  res
    .status(201)
    .json({ success: true, message: "Approval created successfully", data });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/approvals/:id/approve
// ─────────────────────────────────────────────────────────────────────────────

exports.approve = asyncHandler(async (req, res) => {
  const data = await approvalService.approve(
    req.params.id,
    getActorId(req),
    getActorName(req),
    req.body?.reason,
  );

  res.json({ success: true, message: "Approval approved successfully", data });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/approvals/:id/reject
// ─────────────────────────────────────────────────────────────────────────────

exports.reject = asyncHandler(async (req, res) => {
  const data = await approvalService.reject(
    req.params.id,
    getActorId(req),
    getActorName(req),
    req.body?.reason,
  );

  res.json({ success: true, message: "Approval rejected", data });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/approvals/:id/assign
// ─────────────────────────────────────────────────────────────────────────────

exports.assign = asyncHandler(async (req, res) => {
  const reviewer = approvalService.resolveReviewer(
    req.body?.reviewer,
    req.body?.reviewerId,
  );

  const { data, reviewerName } = await approvalService.assign(
    req.params.id,
    reviewer,
    getActorId(req),
    getActorName(req),
  );

  res.json({
    success: true,
    message: `Approval assigned to ${reviewerName}`,
    data,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/approvals/:id/request-revision
// ─────────────────────────────────────────────────────────────────────────────

exports.requestRevision = asyncHandler(async (req, res) => {
  const data = await approvalService.requestRevision(
    req.params.id,
    req.body || {},
    getActorId(req),
    getActorName(req),
  );

  res.json({ success: true, message: "Revision requested", data });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/approvals/:id/comments
// ─────────────────────────────────────────────────────────────────────────────

exports.addComment = asyncHandler(async (req, res) => {
  const authorName =
    req.body?.author ||
    req.user?.display_name ||
    req.user?.firstName ||
    req.user?.name ||
    "System";

  const data = await approvalService.addComment(
    req.params.id,
    { text: req.body?.text, authorName, authorRole: req.body?.role },
    getActorId(req),
  );

  res
    .status(201)
    .json({ success: true, message: "Comment added successfully", data });
});
