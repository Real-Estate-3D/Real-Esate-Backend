// File: src/middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Role } = require('../models');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Get user from database
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['name', 'permissions'],
        through: { attributes: [] },
      }],
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }
    next(error);
  }
};

/**
 * Check if user has required role
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRoles = req.user.roles.map(role => role.name);
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: userRoles,
      });
    }

    next();
  };
};

/**
 * Check if user has required permission
 */
const checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Collect all permissions from user's roles
    const userPermissions = req.user.roles.reduce((acc, role) => {
      return [...acc, ...role.permissions];
    }, []);

    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: requiredPermissions,
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['name', 'permissions'],
        through: { attributes: [] },
      }],
      attributes: { exclude: ['password'] },
    });

    if (user && user.is_active !== false) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  checkPermission,
  optionalAuth,
};
