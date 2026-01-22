// Policy Routes
const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');

// GET /api/v1/policies/categories - Get unique categories
router.get('/categories', policyController.getCategories);

// GET /api/v1/policies - Get all policies
router.get('/', policyController.getAll);

// GET /api/v1/policies/:id - Get single policy
router.get('/:id', policyController.getById);

// POST /api/v1/policies - Create new policy
router.post('/', policyController.create);

// PUT /api/v1/policies/:id - Update policy
router.put('/:id', policyController.update);

// DELETE /api/v1/policies/:id - Delete policy
router.delete('/:id', policyController.delete);

module.exports = router;
