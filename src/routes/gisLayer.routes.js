// File: src/routes/gisLayer.routes.js
const express = require('express');
const router = express.Router();
const gisLayerController = require('../controllers/gisLayer.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes for layer discovery
router.get('/public', gisLayerController.getPublicLayers);
router.get('/public/categories', gisLayerController.getCategories);

// Protected routes
router.use(authenticate);

// CRUD operations
router.get('/', gisLayerController.getAll);
router.post('/', authorize('admin'), gisLayerController.create);
router.get('/:id', gisLayerController.getById);
router.put('/:id', authorize('admin'), gisLayerController.update);
router.delete('/:id', authorize('admin'), gisLayerController.delete);

// Layer discovery
router.get('/categories', gisLayerController.getCategories);
router.get('/by-category/:category', gisLayerController.getByCategory);
router.get('/by-municipality/:municipality', gisLayerController.getByMunicipality);

// Preview URL
router.get('/:id/preview-url', gisLayerController.getPreviewUrl);

// Sync with GeoServer
router.post('/sync', authorize('admin'), gisLayerController.syncWithGeoServer);

module.exports = router;
