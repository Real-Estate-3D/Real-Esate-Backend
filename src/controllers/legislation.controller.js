// Legislation Controller - HTTP layer only; business logic lives in legislation.service.js
const legislationService = require('../services/legislation.service');

const getUser     = (req) => req.user?.id   || null;
const getUserName = (req) => req.user?.name || 'System';

const handleError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error(`${fallbackMessage}:`, error);
  res.status(500).json({ success: false, message: fallbackMessage, error: error.message });
};

const legislationController = {
  async getAll(req, res) {
    try {
      const result = await legislationService.getAll(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, 'Failed to fetch legislations');
    }
  },

  async getById(req, res) {
    try {
      const data = await legislationService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch legislation');
    }
  },

  async create(req, res) {
    try {
      const data = await legislationService.create(req.body, getUser(req), getUserName(req));
      res.status(201).json({ success: true, data, message: 'Legislation created successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to create legislation');
    }
  },

  async update(req, res) {
    try {
      const data = await legislationService.update(req.params.id, req.body, getUser(req), getUserName(req));
      res.json({ success: true, data, message: 'Legislation updated successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to update legislation');
    }
  },

  async delete(req, res) {
    try {
      await legislationService.delete(req.params.id, getUser(req), getUserName(req));
      res.json({ success: true, message: 'Legislation deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete legislation');
    }
  },

  async publish(req, res) {
    try {
      const data = await legislationService.publish(req.params.id, getUser(req), getUserName(req));
      res.json({ success: true, data, message: 'Legislation published successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to publish legislation');
    }
  },
};

module.exports = legislationController;
