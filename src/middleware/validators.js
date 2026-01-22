// File: src/middleware/validators.js
const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Common validation rules
 */
const validators = {
  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],

  // UUID
  uuid: (field) => [
    param(field)
      .isUUID()
      .withMessage(`${field} must be a valid UUID`),
  ],

  // Legislation
  createLegislation: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 500 })
      .withMessage('Title must not exceed 500 characters'),
    body('jurisdiction')
      .trim()
      .notEmpty()
      .withMessage('Jurisdiction is required'),
    body('type')
      .isIn(['by-law', 'zoning-amendment', 'official-plan', 'policy', 'regulation'])
      .withMessage('Invalid legislation type'),
    body('status')
      .optional()
      .isIn(['draft', 'review', 'published', 'archived'])
      .withMessage('Invalid status'),
    body('effectiveDate')
      .optional()
      .isISO8601()
      .withMessage('Effective date must be a valid ISO date'),
  ],

  updateLegislation: [
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty')
      .isLength({ max: 500 })
      .withMessage('Title must not exceed 500 characters'),
    body('jurisdiction')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Jurisdiction cannot be empty'),
    body('type')
      .optional()
      .isIn(['by-law', 'zoning-amendment', 'official-plan', 'policy', 'regulation'])
      .withMessage('Invalid legislation type'),
    body('status')
      .optional()
      .isIn(['draft', 'review', 'published', 'archived'])
      .withMessage('Invalid status'),
  ],

  // Zoning Law
  createZoningLaw: [
    body('legislationId')
      .isUUID()
      .withMessage('Legislation ID must be a valid UUID'),
    body('zoneCode')
      .trim()
      .notEmpty()
      .withMessage('Zone code is required')
      .isLength({ max: 50 })
      .withMessage('Zone code must not exceed 50 characters'),
    body('zoneName')
      .trim()
      .notEmpty()
      .withMessage('Zone name is required'),
    body('geometry')
      .notEmpty()
      .withMessage('Geometry is required'),
  ],

  // Policy
  createPolicy: [
    body('legislationId')
      .optional()
      .isUUID()
      .withMessage('Legislation ID must be a valid UUID'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required'),
  ],

  // Workflow
  createWorkflow: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Workflow name is required'),
    body('type')
      .isIn(['approval', 'review', 'consultation', 'custom'])
      .withMessage('Invalid workflow type'),
  ],

  // User registration
  registerUser: [
    body('email')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
  ],

  // User login
  loginUser: [
    body('email')
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
};

module.exports = {
  validate,
  validators,
};
