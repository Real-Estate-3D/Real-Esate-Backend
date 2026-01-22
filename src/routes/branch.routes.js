// Branch Routes - API endpoints for legislation branches
const express = require('express');
const router = express.Router({ mergeParams: true }); // Access :legislationId from parent router
const branchController = require('../controllers/branch.controller');

// GET /api/v1/legislations/:legislationId/branches - Get all branches
router.get('/', branchController.getAll);

// GET /api/v1/legislations/:legislationId/branches/timeline - Get branch timeline (must be before :id)
router.get('/timeline', branchController.getTimeline);

// GET /api/v1/legislations/:legislationId/branches/:id - Get single branch
router.get('/:id', branchController.getById);

// POST /api/v1/legislations/:legislationId/branches - Create new branch
router.post('/', branchController.create);

// PUT /api/v1/legislations/:legislationId/branches/:id - Update branch
router.put('/:id', branchController.update);

// DELETE /api/v1/legislations/:legislationId/branches/:id - Delete branch
router.delete('/:id', branchController.delete);

// POST /api/v1/legislations/:legislationId/branches/:id/apply - Apply branch changes
router.post('/:id/apply', branchController.applyBranch);

// POST /api/v1/legislations/:legislationId/branches/:id/merge - Merge branch
router.post('/:id/merge', branchController.mergeBranch);

module.exports = router;
