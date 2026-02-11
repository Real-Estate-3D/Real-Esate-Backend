// Legislation Routes
const express = require('express');
const router = express.Router();
const legislationController = require('../controllers/legislation.controller');
const { authenticate } = require('../middleware/auth');
const { requireToolPermission } = require('../middleware/toolPermissions');

const canViewLegislation = requireToolPermission('legislation', 'view');
const canEditLegislation = requireToolPermission('legislation', 'edit');

router.use(authenticate);

// GET /api/v1/legislations - Get all legislations
router.get('/', canViewLegislation, legislationController.getAll);

// GET /api/v1/legislations/:id - Get single legislation
router.get('/:id', canViewLegislation, legislationController.getById);

// POST /api/v1/legislations - Create new legislation
router.post('/', canEditLegislation, legislationController.create);

// PUT /api/v1/legislations/:id - Update legislation
router.put('/:id', canEditLegislation, legislationController.update);

// DELETE /api/v1/legislations/:id - Delete legislation
router.delete('/:id', canEditLegislation, legislationController.delete);

// POST /api/v1/legislations/:id/publish - Publish legislation
router.post('/:id/publish', canEditLegislation, legislationController.publish);

module.exports = router;
