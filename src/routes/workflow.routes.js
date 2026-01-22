// Workflow Routes
const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');

// GET /api/v1/workflows - Get all workflows
router.get('/', workflowController.getAll);

// GET /api/v1/workflows/:id - Get single workflow
router.get('/:id', workflowController.getById);

// POST /api/v1/workflows - Create new workflow
router.post('/', workflowController.create);

// PUT /api/v1/workflows/:id - Update workflow
router.put('/:id', workflowController.update);

// DELETE /api/v1/workflows/:id - Delete workflow
router.delete('/:id', workflowController.delete);

module.exports = router;
