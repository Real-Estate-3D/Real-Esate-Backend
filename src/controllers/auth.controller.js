// File: src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Role } = require('../models');
const config = require('../config');
const { ApiError } = require('../middleware/errorHandler');
const asyncHandler = require('../middleware/asyncHandler');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

// Register new user
exports.register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, organization } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  // Create user
  const user = await User.create({
    email,
    password,
    first_name: firstName,
    last_name: lastName,
    organization,
    verification_token: crypto.randomBytes(32).toString('hex'),
  });

  // Assign default role
  const defaultRole = await Role.findOne({ where: { name: 'user' } });
  if (defaultRole) {
    await user.addRole(defaultRole);
  }

  // Generate token
  const token = generateToken(user.id);

  res.status(201).json({
    status: 'success',
    data: {
      user: user.toJSON(),
      token,
    },
  });
});

// Login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({
    where: { email },
    include: [{ model: Role, as: 'roles' }],
  });

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.is_active) {
    throw new ApiError(401, 'Account is deactivated');
  }

  // Update login info
  await user.update({
    last_login: new Date(),
    login_count: user.login_count + 1,
  });

  // Generate token
  const token = generateToken(user.id);

  res.json({
    status: 'success',
    data: {
      user: user.toJSON(),
      token,
    },
  });
});

// Get current user
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    include: [{ model: Role, as: 'roles' }],
  });

  res.json({
    status: 'success',
    data: { user: user.toJSON() },
  });
});

// Update current user
exports.updateMe = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, department, title, organization, preferences } = req.body;

  const user = await User.findByPk(req.user.id);
  
  await user.update({
    first_name: firstName,
    last_name: lastName,
    phone,
    department,
    title,
    organization,
    preferences,
  });

  res.json({
    status: 'success',
    data: { user: user.toJSON() },
  });
});

// Change password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findByPk(req.user.id);

  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  await user.update({ password: newPassword });

  // Generate new token
  const token = generateToken(user.id);

  res.json({
    status: 'success',
    message: 'Password changed successfully',
    data: { token },
  });
});

// Forgot password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    // Don't reveal if email exists
    return res.json({
      status: 'success',
      message: 'If the email exists, a reset link will be sent',
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  await user.update({
    reset_password_token: resetToken,
    reset_password_expires: new Date(Date.now() + 3600000), // 1 hour
  });

  // TODO: Send email with reset link

  res.json({
    status: 'success',
    message: 'If the email exists, a reset link will be sent',
  });
});

// Reset password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    where: {
      reset_password_token: token,
    },
  });

  if (!user || user.reset_password_expires < new Date()) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  await user.update({
    password,
    reset_password_token: null,
    reset_password_expires: null,
  });

  res.json({
    status: 'success',
    message: 'Password reset successfully',
  });
});

// Verify email
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    where: { verification_token: token },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid verification token');
  }

  await user.update({
    is_verified: true,
    verification_token: null,
  });

  res.json({
    status: 'success',
    message: 'Email verified successfully',
  });
});

// Logout
exports.logout = asyncHandler(async (req, res) => {
  // For JWT, we just acknowledge logout
  // In production, you might want to blacklist the token
  res.json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

// Refresh token
exports.refreshToken = asyncHandler(async (req, res) => {
  const token = generateToken(req.user.id);

  res.json({
    status: 'success',
    data: { token },
  });
});
