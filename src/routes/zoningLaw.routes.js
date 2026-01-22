// ZoningLaw Routes
const express = require('express');
const router = express.Router();
const zoningLawController = require('../controllers/zoningLaw.controller');

// GET /api/v1/zoning-laws - Get all zoning laws
router.get('/', zoningLawController.getAll);

// GET /api/v1/zoning-laws/zone-code/:code - Get by zone code
router.get('/zone-code/:code', zoningLawController.getByZoneCode);

// GET /api/v1/zoning-laws/municipality/:municipality - Get by municipality
router.get('/municipality/:municipality', zoningLawController.getByMunicipality);

// GET /api/v1/zoning-laws/:id - Get single zoning law
router.get('/:id', zoningLawController.getById);

// POST /api/v1/zoning-laws - Create new zoning law
router.post('/', zoningLawController.create);

// POST /api/v1/zoning-laws/:id/duplicate - Duplicate zoning law
router.post('/:id/duplicate', zoningLawController.duplicate);

// PUT /api/v1/zoning-laws/:id - Update zoning law
router.put('/:id', zoningLawController.update);

// DELETE /api/v1/zoning-laws/:id - Delete zoning law
router.delete('/:id', zoningLawController.delete);

module.exports = router;
