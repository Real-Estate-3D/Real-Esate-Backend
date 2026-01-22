// ChangeHistory Routes
const express = require('express');
const router = express.Router();
const changeHistoryController = require('../controllers/changeHistory.controller');

// GET /api/v1/change-history - Get all change history
router.get('/', changeHistoryController.getAll);

// GET /api/v1/change-history/legislation/:id - Get history for legislation
router.get('/legislation/:id', changeHistoryController.getByLegislation);

// GET /api/v1/change-history/zoning-law/:id - Get history for zoning law
router.get('/zoning-law/:id', changeHistoryController.getByZoningLaw);

// GET /api/v1/change-history/:id - Get single change history record
router.get('/:id', changeHistoryController.getById);

module.exports = router;
