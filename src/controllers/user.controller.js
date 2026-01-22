// File: src/controllers/user.controller.js
const { User, Role, UserRole } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const asyncHandler = require('../middleware/asyncHandler');
const { Op } = require('sequelize');
const crypto = require('crypto');

// Get all users
exports.getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, role } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { email: { [Op.iLike]: `%${search}%` } },
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (status === 'active') where.is_active = true;
  if (status === 'inactive') where.is_active = false;

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [{ model: Role, as: 'roles', attributes: ['id', 'name', 'display_name'] }],
    offset: parseInt(offset),
    limit: parseInt(limit),
    order: [['created_at', 'DESC']],
  });

  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
    },
  });
});

// Get user by ID
exports.getById = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [{ model: Role, as: 'roles' }],
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    status: 'success',
    data: { user: user.toJSON() },
  });
});

// Create user
exports.create = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, department, title, organization, roles } = req.body;

  const user = await User.create({
    email,
    password,
    first_name: firstName,
    last_name: lastName,
    phone,
    department,
    title,
    organization,
  });

  // Assign roles
  if (roles && roles.length > 0) {
    const roleInstances = await Role.findAll({
      where: { id: roles },
    });
    await user.setRoles(roleInstances);
  }

  res.status(201).json({
    status: 'success',
    data: { user: user.toJSON() },
  });
});

// Update user
exports.update = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const { firstName, lastName, phone, department, title, organization, is_active, roles } = req.body;

  await user.update({
    first_name: firstName,
    last_name: lastName,
    phone,
    department,
    title,
    organization,
    is_active,
  });

  // Update roles if provided
  if (roles) {
    const roleInstances = await Role.findAll({
      where: { id: roles },
    });
    await user.setRoles(roleInstances);
  }

  res.json({
    status: 'success',
    data: { user: user.toJSON() },
  });
});

// Delete user
exports.delete = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await user.destroy();

  res.json({
    status: 'success',
    message: 'User deleted successfully',
  });
});

// Get user roles
exports.getUserRoles = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [{ model: Role, as: 'roles' }],
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    status: 'success',
    data: { roles: user.roles },
  });
});

// Assign role to user
exports.assignRole = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  const role = await Role.findByPk(req.body.roleId);

  if (!user) throw new ApiError(404, 'User not found');
  if (!role) throw new ApiError(404, 'Role not found');

  await user.addRole(role, { through: { granted_by: req.user.id } });

  res.json({
    status: 'success',
    message: 'Role assigned successfully',
  });
});

// Remove role from user
exports.removeRole = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  const role = await Role.findByPk(req.params.roleId);

  if (!user) throw new ApiError(404, 'User not found');
  if (!role) throw new ApiError(404, 'Role not found');

  await user.removeRole(role);

  res.json({
    status: 'success',
    message: 'Role removed successfully',
  });
});

// Invite user
exports.inviteUser = asyncHandler(async (req, res) => {
  const { email, firstName, lastName, roles } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  // Create user with temporary password
  const tempPassword = crypto.randomBytes(16).toString('hex');
  const user = await User.create({
    email,
    password: tempPassword,
    first_name: firstName,
    last_name: lastName,
    verification_token: crypto.randomBytes(32).toString('hex'),
  });

  // Assign roles
  if (roles && roles.length > 0) {
    const roleInstances = await Role.findAll({ where: { id: roles } });
    await user.setRoles(roleInstances);
  }

  // TODO: Send invitation email

  res.status(201).json({
    status: 'success',
    message: 'Invitation sent successfully',
    data: { user: user.toJSON() },
  });
});
