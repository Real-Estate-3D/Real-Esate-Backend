// Branch Controller - HTTP layer only; business logic lives in branch.service.js
const branchService = require('../services/branch.service');

const getUser     = (req) => req.user?.id   || null;
const getUserName = (req) => req.user?.name || 'System';

const handleError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error(`${fallbackMessage}:`, error);
  res.status(500).json({ success: false, message: fallbackMessage, error: error.message });
};

const branchController = {
  async getAll(req, res) {
    try {
      const result = await branchService.getAll(req.params.legislationId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, 'Failed to fetch branches');
    }
  },

  async getById(req, res) {
    try {
      const data = await branchService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch branch');
    }
  },

  async create(req, res) {
    try {
      const data = await branchService.create(
        req.params.legislationId,
        req.body,
        getUser(req),
        getUserName(req)
      );
      res.status(201).json({ success: true, data, message: 'Branch created successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to create branch');
    }
  },

  async update(req, res) {
    try {
      const data = await branchService.update(req.params.id, req.body, getUser(req), getUserName(req));
      res.json({ success: true, data, message: 'Branch updated successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to update branch');
    }
  },

  async delete(req, res) {
    try {
      await branchService.delete(req.params.id, getUser(req), getUserName(req));
      res.json({ success: true, message: 'Branch deleted successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to delete branch');
    }
  },

  async applyBranch(req, res) {
    try {
      const apply = req.body?.apply !== false; // default true
      const { branch, apply: appliedState } = await branchService.applyBranch(
        req.params.id,
        apply,
        getUser(req),
        getUserName(req)
      );
      res.json({
        success: true,
        data:    branch,
        message: `Branch ${appliedState ? 'applied' : 'unapplied'} successfully`,
      });
    } catch (error) {
      handleError(res, error, 'Failed to apply branch');
    }
  },

  async mergeBranch(req, res) {
    try {
      const data = await branchService.mergeBranch(
        req.params.id,
        req.body?.target_branch_id,
        getUser(req),
        getUserName(req)
      );
      res.json({ success: true, data, message: 'Branch merged successfully' });
    } catch (error) {
      handleError(res, error, 'Failed to merge branch');
    }
  },

  async getTimeline(req, res) {
    try {
      const data = await branchService.getTimeline(req.params.legislationId);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch branch timeline');
    }
  },
};

module.exports = branchController;
