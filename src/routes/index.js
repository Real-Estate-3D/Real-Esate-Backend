// File: src/routes/index.js
const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const legislationRoutes = require("./legislation.routes");
const zoningLawRoutes = require("./zoningLaw.routes");
const policyRoutes = require("./policy.routes");
const changeHistoryRoutes = require("./changeHistory.routes");
const branchRoutes = require("./branch.routes");
// const gisLayerRoutes = require('./gisLayer.routes'); // TODO: Implement controller
const gisScheduleRoutes = require("./gisSchedule.routes");
const workflowRoutes = require("./workflow.routes");
// const boundaryRoutes = require('./boundary.routes'); // TODO: Implement controller
// const parcelRoutes = require('./parcel.routes'); // TODO: Implement controller

// API version prefix
const API_PREFIX = "/api/v1";

// Health check
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount routes
router.use(`${API_PREFIX}/auth`, authRoutes);
router.use(`${API_PREFIX}/users`, userRoutes);
router.use(`${API_PREFIX}/legislations`, legislationRoutes);
router.use(`${API_PREFIX}/legislations/:legislationId/branches`, branchRoutes);
router.use(`${API_PREFIX}/zoning-laws`, zoningLawRoutes);
router.use(`${API_PREFIX}/policies`, policyRoutes);
router.use(`${API_PREFIX}/change-history`, changeHistoryRoutes);
// router.use(`${API_PREFIX}/gis-layers`, gisLayerRoutes); // TODO: Implement controller
router.use(`${API_PREFIX}/gis-schedules`, gisScheduleRoutes);
router.use(`${API_PREFIX}/workflows`, workflowRoutes);
// router.use(`${API_PREFIX}/boundaries`, boundaryRoutes); // TODO: Implement controller
// router.use(`${API_PREFIX}/parcels`, parcelRoutes); // TODO: Implement controller

module.exports = router;
