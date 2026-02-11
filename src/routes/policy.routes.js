// Policy Routes
const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');
const { authenticate } = require('../middleware/auth');
const { requireToolPermission } = require('../middleware/toolPermissions');

const canViewLegislation = requireToolPermission('legislation', 'view');
const canEditLegislation = requireToolPermission('legislation', 'edit');

router.use(authenticate);

// GET /api/v1/policies/categories - Get unique categories
router.get('/categories', canViewLegislation, policyController.getCategories);

// GET /api/v1/policies - Get all policies
router.get('/', canViewLegislation, policyController.getAll);

// GET /api/v1/policies/:id - Get single policy
router.get('/:id', canViewLegislation, policyController.getById);

// POST /api/v1/policies - Create new policy
router.post('/', canEditLegislation, policyController.create);

// PUT /api/v1/policies/:id - Update policy
router.put('/:id', canEditLegislation, policyController.update);

// DELETE /api/v1/policies/:id - Delete policy
router.delete('/:id', canEditLegislation, policyController.delete);

module.exports = router;
