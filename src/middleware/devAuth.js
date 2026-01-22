// File: src/middleware/devAuth.js
// Development-only authentication bypass for testing
// WARNING: Only use in development mode!

const config = require('../config');

/**
 * Mock user for development testing
 */
const mockUser = {
  id: 1,
  email: 'dev@test.com',
  firstName: 'Dev',
  lastName: 'User',
  isActive: true,
  roles: [
    {
      name: 'admin',
      permissions: ['*'], // All permissions
    },
  ],
};

/**
 * Development authentication bypass
 * Injects a mock admin user in development mode
 */
const devAuthBypass = (req, res, next) => {
  if (config.nodeEnv === 'development') {
    // Inject mock user for all requests in development
    req.user = mockUser;
    console.log('🔓 Dev mode: Using mock admin user');
    next();
  } else {
    // In production, this middleware should not be used
    return res.status(403).json({
      success: false,
      message: 'Development bypass not available in production',
    });
  }
};

module.exports = {
  devAuthBypass,
  mockUser,
};
