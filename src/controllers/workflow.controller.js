// Workflow Controller - HTTP layer only; business logic lives in workflow.service.js
const workflowService = require('../services/workflow.service');

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const isValidationErrorMessage = (message = '') =>
  /required|invalid|duplicate|must be|cannot be empty|at least one/i.test(message);

const workflowController = {
  // GET /api/v1/workflows - Get all workflows
  async getAll(req, res) {
    try {
      const page = parsePositiveInteger(req.query.page, 1);
      const limit = Math.min(parsePositiveInteger(req.query.limit, 10), 100);

      const result = await workflowService.getAll({ ...req.query, page, limit });

      res.json({ success: true, ...result });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error('Error fetching workflows:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflows',
        error: error.message,
      });
    }
  },

  // GET /api/v1/workflows/map - Get workflows for map mode
  async getMap(req, res) {
    try {
      const limit = Math.min(parsePositiveInteger(req.query.limit, 500), 2000);

      const data = await workflowService.getMap({ ...req.query, limit });

      res.json({ success: true, data });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error('Error fetching workflow map data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflow map data',
        error: error.message,
      });
    }
  },

  // GET /api/v1/workflows/metadata - Builder metadata
  async getMetadata(req, res) {
    try {
      const data = await workflowService.getMetadata();
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error fetching workflow metadata:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflow metadata',
        error: error.message,
      });
    }
  },

  // GET /api/v1/workflows/:id - Get single workflow
  async getById(req, res) {
    try {
      const data = await workflowService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      console.error('Error fetching workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflow',
        error: error.message,
      });
    }
  },

  // POST /api/v1/workflows - Create workflow
  async create(req, res) {
    try {
      const data = await workflowService.create(req.body, req.user?.id || null);
      res.status(201).json({ success: true, data, message: 'Workflow created successfully' });
    } catch (error) {
      const isValidationError = isValidationErrorMessage(error.message);
      const statusCode = isValidationError ? 400 : 500;
      console.error('Error creating workflow:', error);
      res.status(statusCode).json({
        success: false,
        message: isValidationError ? error.message : 'Failed to create workflow',
        error: error.message,
      });
    }
  },

  // PUT /api/v1/workflows/:id - Update workflow
  async update(req, res) {
    try {
      const data = await workflowService.update(req.params.id, req.body);
      res.json({ success: true, data, message: 'Workflow updated successfully' });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      const isValidationError = isValidationErrorMessage(error.message);
      const statusCode = isValidationError ? 400 : 500;
      console.error('Error updating workflow:', error);
      res.status(statusCode).json({
        success: false,
        message: isValidationError ? error.message : 'Failed to update workflow',
        error: error.message,
      });
    }
  },

  // DELETE /api/v1/workflows/:id - Delete workflow
  async delete(req, res) {
    try {
      await workflowService.delete(req.params.id);
      res.json({ success: true, message: 'Workflow deleted successfully' });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.statusCode === 409) {
        return res.status(409).json({
          success: false,
          message: error.message,
          conflictType: error.conflictType,
          linkedCount: error.linkedCount,
        });
      }
      console.error('Error deleting workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete workflow',
        error: error.message,
      });
    }
  },
};

module.exports = workflowController;
