// ZoningLaw Routes
const express = require('express');
const router = express.Router();
const zoningLawController = require('../controllers/zoningLaw.controller');
const { authenticate } = require('../middleware/auth');
const { requireToolPermission } = require('../middleware/toolPermissions');

const canViewLegislation = requireToolPermission('legislation', 'view');
const canEditLegislation = requireToolPermission('legislation', 'edit');

router.use(authenticate);

// GET /api/v1/zoning-laws - Get all zoning laws
router.get('/', canViewLegislation, zoningLawController.getAll);

// GET /api/v1/zoning-laws/zone-code/:code - Get by zone code
router.get('/zone-code/:code', canViewLegislation, zoningLawController.getByZoneCode);

// GET /api/v1/zoning-laws/municipality/:municipality - Get by municipality
router.get('/municipality/:municipality', canViewLegislation, zoningLawController.getByMunicipality);

// GET /api/v1/zoning-laws/:id - Get single zoning law
router.get('/:id', canViewLegislation, zoningLawController.getById);

// POST /api/v1/zoning-laws - Create new zoning law
router.post('/', canEditLegislation, zoningLawController.create);

// POST /api/v1/zoning-laws/:id/duplicate - Duplicate zoning law
router.post('/:id/duplicate', canEditLegislation, zoningLawController.duplicate);

// PUT /api/v1/zoning-laws/:id - Update zoning law
router.put('/:id', canEditLegislation, zoningLawController.update);

// DELETE /api/v1/zoning-laws/:id - Delete zoning law
router.delete('/:id', canEditLegislation, zoningLawController.delete);

module.exports = router;
