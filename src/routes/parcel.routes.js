// File: src/routes/parcel.routes.js
const express = require('express');
const router = express.Router();
const parcelController = require('../controllers/parcel.controller');
const { authenticate } = require('../middleware/auth');

// Public routes for parcel search
router.get('/search', parcelController.search);
router.get('/:id', parcelController.getById);
router.get('/by-arn/:arn', parcelController.getByArn);
router.get('/by-pin/:pin', parcelController.getByPin);
router.get('/by-address', parcelController.getByAddress);

// Spatial queries
router.post('/find-by-point', parcelController.findByPoint);
router.post('/find-by-bbox', parcelController.findByBbox);

// By municipality
router.get('/by-municipality/:municipality', parcelController.getByMunicipality);

// Protected routes for parcel management
router.use(authenticate);
router.get('/', parcelController.getAll);

module.exports = router;
