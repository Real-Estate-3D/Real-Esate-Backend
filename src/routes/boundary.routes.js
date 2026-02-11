// File: src/routes/boundary.routes.js
const express = require('express');
const router = express.Router();
const boundaryController = require('../controllers/boundary.controller');
const { authenticate } = require('../middleware/auth');

// Public routes for GIS data
router.get('/municipalities', boundaryController.getMunicipalities);
router.get('/municipalities/:id', boundaryController.getMunicipalityById);
router.get('/upper-tier', boundaryController.getUpperTiers);
router.get('/upper-tier/:id', boundaryController.getUpperTierById);
router.get('/lower-tier', boundaryController.getLowerTiers);
router.get('/lower-tier/:id', boundaryController.getLowerTierById);
router.get('/single-tier', boundaryController.getSingleTiers);
router.get('/single-tier/:id', boundaryController.getSingleTierById);
router.get('/wards', boundaryController.getWards);
router.get('/wards/:id', boundaryController.getWardById);

// Hierarchy navigation
router.get('/upper-tier/:id/children', boundaryController.getUpperTierChildren);
router.get('/municipality/:id/wards', boundaryController.getMunicipalityWards);

// Spatial queries
router.post('/find-by-point', boundaryController.findByPoint);
router.post('/find-by-bbox', boundaryController.findByBbox);

// Search
router.get('/search', boundaryController.search);
router.post('/validate-polygon', authenticate, boundaryController.validatePolygon);

module.exports = router;
