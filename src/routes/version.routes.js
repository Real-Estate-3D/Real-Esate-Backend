// Version Routes - Legislation version history
const express = require('express');
const router = express.Router({ mergeParams: true }); // Access :legislationId from parent router
const versionController = require('../controllers/version.controller');

// GET /api/v1/legislations/:legislationId/versions - List all versions
router.get('/', versionController.getAll);

// GET /api/v1/legislations/:legislationId/versions/:versionId - Get single version
router.get('/:versionId', versionController.getById);

// POST /api/v1/legislations/:legislationId/versions - Create a version snapshot
router.post('/', versionController.create);

module.exports = router;
