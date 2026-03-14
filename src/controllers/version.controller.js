// Version Controller - HTTP layer only; business logic lives in version.service.js
const versionService = require('../services/version.service');

const handleError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error(`${fallbackMessage}:`, error);
  res.status(500).json({ success: false, message: fallbackMessage, error: error.message });
};

const versionController = {
  async getAll(req, res) {
    try {
      const result = await versionService.getAll(req.params.legislationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, 'Failed to fetch versions');
    }
  },

  async getById(req, res) {
    try {
      const data = await versionService.getById(req.params.versionId);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch version');
    }
  },

  async create(req, res) {
    try {
      const data = await versionService.create(
        req.params.legislationId,
        req.body,
        req.user?.id || null
      );
      res.status(201).json({ success: true, data, message: 'Version created successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to create version');
    }
  },
};

module.exports = versionController;
