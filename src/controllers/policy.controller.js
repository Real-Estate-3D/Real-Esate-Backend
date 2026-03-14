// Policy Controller - HTTP layer only; business logic lives in policy.service.js
const policyService = require('../services/policy.service');

const getUser     = (req) => req.user?.id   || null;
const getUserName = (req) => req.user?.name || 'System';

const handleError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error(`${fallbackMessage}:`, error);
  res.status(500).json({ success: false, message: fallbackMessage, error: error.message });
};

const policyController = {
  async getAll(req, res) {
    try {
      const result = await policyService.getAll(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, 'Failed to fetch policies');
    }
  },

  async getById(req, res) {
    try {
      const data = await policyService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch policy');
    }
  },

  async create(req, res) {
    try {
      const data = await policyService.create(req.body, getUser(req), getUserName(req));
      res.status(201).json({ success: true, data, message: 'Policy created successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to create policy');
    }
  },

  async update(req, res) {
    try {
      const data = await policyService.update(req.params.id, req.body, getUser(req), getUserName(req));
      res.json({ success: true, data, message: 'Policy updated successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to update policy');
    }
  },

  async delete(req, res) {
    try {
      await policyService.delete(req.params.id, getUser(req), getUserName(req));
      res.json({ success: true, message: 'Policy deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete policy');
    }
  },

  async getCategories(req, res) {
    try {
      const data = await policyService.getCategories();
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch categories');
    }
  },
};

module.exports = policyController;
