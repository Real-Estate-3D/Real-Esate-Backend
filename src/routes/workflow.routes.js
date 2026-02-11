// Workflow Routes
const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');
const { authenticate } = require('../middleware/auth');
const { requireToolPermission } = require('../middleware/toolPermissions');

const canViewLegislation = requireToolPermission('legislation', 'view');
const canEditLegislation = requireToolPermission('legislation', 'edit');

router.use(authenticate);

// GET /api/v1/workflows - Get all workflows
router.get('/', canViewLegislation, workflowController.getAll);

// GET /api/v1/workflows/:id - Get single workflow
router.get('/:id', canViewLegislation, workflowController.getById);

// POST /api/v1/workflows - Create new workflow
router.post('/', canEditLegislation, workflowController.create);

// PUT /api/v1/workflows/:id - Update workflow
router.put('/:id', canEditLegislation, workflowController.update);

// DELETE /api/v1/workflows/:id - Delete workflow
router.delete('/:id', canEditLegislation, workflowController.delete);

module.exports = router;
