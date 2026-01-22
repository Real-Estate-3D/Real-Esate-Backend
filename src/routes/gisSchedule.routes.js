// File: src/routes/gisSchedule.routes.js
const express = require('express');
const router = express.Router();
const gisScheduleController = require('../controllers/gisSchedule.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { devAuthBypass } = require('../middleware/devAuth');
const { uploadGISFile } = require('../middleware/upload');
const config = require('../config');

// Protected routes - use dev bypass in development
router.use(config.nodeEnv === 'development' ? devAuthBypass : authenticate);

// CRUD operations
router.get('/', gisScheduleController.getAll);
router.post('/', gisScheduleController.create);
router.get('/types', gisScheduleController.getScheduleTypes);
router.get('/by-legislation/:legislationId', gisScheduleController.getByLegislation);
router.get('/:id', gisScheduleController.getById);
router.put('/:id', gisScheduleController.update);
router.delete('/:id', gisScheduleController.delete);

// File upload
router.post('/upload', uploadGISFile.single('file'), gisScheduleController.uploadFile);

module.exports = router;
