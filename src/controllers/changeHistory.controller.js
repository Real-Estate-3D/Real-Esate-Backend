// ChangeHistory Controller - HTTP layer only; business logic lives in changeHistory.service.js
const changeHistoryService = require('../services/changeHistory.service');

const handleError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error(`${fallbackMessage}:`, error);
  res.status(500).json({ success: false, message: fallbackMessage, error: error.message });
};

const changeHistoryController = {
  async getAll(req, res) {
    try {
      const result = await changeHistoryService.getAll(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, 'Failed to fetch change history');
    }
  },

  async getById(req, res) {
    try {
      const data = await changeHistoryService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch change history');
    }
  },

  async getByLegislation(req, res) {
    try {
      const result = await changeHistoryService.getByLegislation(req.params.id, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, 'Failed to fetch change history');
    }
  },

  async getByZoningLaw(req, res) {
    try {
      const result = await changeHistoryService.getByZoningLaw(req.params.id, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, 'Failed to fetch change history');
    }
  },
};

module.exports = changeHistoryController;
