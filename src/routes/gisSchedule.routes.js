// File: src/routes/gisSchedule.routes.js
const express = require('express');
const router = express.Router();
const gisScheduleController = require('../controllers/gisSchedule.controller');
const { authenticate } = require('../middleware/auth');
const { requireToolPermission } = require('../middleware/toolPermissions');
const { uploadGISFile } = require('../middleware/upload');

const canViewLegislation = requireToolPermission('legislation', 'view');
const canEditLegislation = requireToolPermission('legislation', 'edit');

router.use(authenticate);

// CRUD operations
router.get('/', canViewLegislation, gisScheduleController.getAll);
router.post('/', canEditLegislation, gisScheduleController.create);
router.get('/types', canViewLegislation, gisScheduleController.getScheduleTypes);
router.get('/by-legislation/:legislationId', canViewLegislation, gisScheduleController.getByLegislation);
router.get('/:id', canViewLegislation, gisScheduleController.getById);
router.put('/:id', canEditLegislation, gisScheduleController.update);
router.delete('/:id', canEditLegislation, gisScheduleController.delete);

// File upload
router.post('/upload', canEditLegislation, uploadGISFile.single('file'), gisScheduleController.uploadFile);

module.exports = router;
