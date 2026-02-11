// ChangeHistory Routes
const express = require('express');
const router = express.Router();
const changeHistoryController = require('../controllers/changeHistory.controller');
const { authenticate } = require('../middleware/auth');
const { requireToolPermission } = require('../middleware/toolPermissions');

const canViewLegislation = requireToolPermission('legislation', 'view');

router.use(authenticate);

// GET /api/v1/change-history - Get all change history
router.get('/', canViewLegislation, changeHistoryController.getAll);

// GET /api/v1/change-history/legislation/:id - Get history for legislation
router.get('/legislation/:id', canViewLegislation, changeHistoryController.getByLegislation);

// GET /api/v1/change-history/zoning-law/:id - Get history for zoning law
router.get('/zoning-law/:id', canViewLegislation, changeHistoryController.getByZoningLaw);

// GET /api/v1/change-history/:id - Get single change history record
router.get('/:id', canViewLegislation, changeHistoryController.getById);

module.exports = router;
