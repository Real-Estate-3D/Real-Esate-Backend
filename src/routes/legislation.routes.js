// Legislation Routes
const express = require('express');
const router = express.Router();
const legislationController = require('../controllers/legislation.controller');

// GET /api/v1/legislations - Get all legislations
router.get('/', legislationController.getAll);

// GET /api/v1/legislations/:id - Get single legislation
router.get('/:id', legislationController.getById);

// POST /api/v1/legislations - Create new legislation
router.post('/', legislationController.create);

// PUT /api/v1/legislations/:id - Update legislation
router.put('/:id', legislationController.update);

// DELETE /api/v1/legislations/:id - Delete legislation
router.delete('/:id', legislationController.delete);

// POST /api/v1/legislations/:id/publish - Publish legislation
router.post('/:id/publish', legislationController.publish);

module.exports = router;
