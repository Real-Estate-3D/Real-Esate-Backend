// File: src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// User management (admin only)
router.get('/', authorize('admin'), userController.getAll);
router.post('/', authorize('admin'), userController.create);
router.get('/:id', authorize('admin'), userController.getById);
router.put('/:id', authorize('admin'), userController.update);
router.delete('/:id', authorize('admin'), userController.delete);

// Role management
router.get('/:id/roles', authorize('admin'), userController.getUserRoles);
router.post('/:id/roles', authorize('admin'), userController.assignRole);
router.delete('/:id/roles/:roleId', authorize('admin'), userController.removeRole);

// User invitations
router.post('/invite', authorize('admin'), userController.inviteUser);

module.exports = router;
