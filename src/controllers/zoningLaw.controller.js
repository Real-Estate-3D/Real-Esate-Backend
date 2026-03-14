// ZoningLaw Controller - HTTP layer only; business logic lives in zoningLaw.service.js
const zoningLawService = require('../services/zoningLaw.service');

const getActor = (req) => ({
  userId:          req.user?.id          || null,
  userJurisdiction: req.user?.jurisdiction || null,
  userName:        req.user?.name        || 'System',
});

const handleError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    const body = { success: false, message: error.message };
    if (error.validation) body.validation = error.validation;
    return res.status(error.statusCode).json(body);
  }
  console.error(`${fallbackMessage}:`, error);
  res.status(500).json({ success: false, message: fallbackMessage, error: error.message });
};

const zoningLawController = {
  async getAll(req, res) {
    try {
      const result = await zoningLawService.getAll(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, 'Failed to fetch zoning laws');
    }
  },

  async getById(req, res) {
    try {
      const data = await zoningLawService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch zoning law');
    }
  },

  async create(req, res) {
    try {
      const actor = getActor(req);
      const data  = await zoningLawService.create(req.body, actor);
      res.status(201).json({ success: true, data, message: 'Zoning law created successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to create zoning law');
    }
  },

  async update(req, res) {
    try {
      const actor = getActor(req);
      const data  = await zoningLawService.update(req.params.id, req.body, actor);
      res.json({ success: true, data, message: 'Zoning law updated successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to update zoning law');
    }
  },

  async delete(req, res) {
    try {
      const { userId, userName } = getActor(req);
      await zoningLawService.delete(req.params.id, userId, userName);
      res.json({ success: true, message: 'Zoning law deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete zoning law');
    }
  },

  async duplicate(req, res) {
    try {
      const { userId, userName } = getActor(req);
      const data = await zoningLawService.duplicate(req.params.id, userId, userName);
      res.status(201).json({ success: true, data, message: 'Zoning law duplicated successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to duplicate zoning law');
    }
  },

  async getByZoneCode(req, res) {
    try {
      const data = await zoningLawService.getByZoneCode(req.params.code);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch zoning laws');
    }
  },

  async getByMunicipality(req, res) {
    try {
      const data = await zoningLawService.getByMunicipality(req.params.municipality);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch zoning laws');
    }
  },
};

module.exports = zoningLawController;
