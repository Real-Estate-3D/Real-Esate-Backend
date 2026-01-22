// Branch Controller - CRUD operations for legislation branches
const { LegislationBranch, Legislation, ChangeHistory } = require('../models');
const { Op } = require('sequelize');

const branchController = {
  // GET /api/v1/legislations/:legislationId/branches - Get all branches for a legislation
  async getAll(req, res) {
    try {
      const { legislationId } = req.params;
      const {
        page = 1,
        limit = 20,
        status,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = { legislation_id: legislationId };

      // Status filter
      if (status && status !== 'all') {
        where.status = status;
      }

      const { count, rows } = await LegislationBranch.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset
      });

      // Transform data for frontend
      const data = rows.map(branch => ({
        id: branch.id,
        name: branch.name,
        description: branch.description,
        status: branch.status,
        isMain: branch.is_main,
        parentBranchId: branch.parent_branch_id,
        baseVersionId: branch.base_version_id,
        mergedAt: branch.merged_at,
        mergedBy: branch.merged_by,
        mergedIntoBranchId: branch.merged_into_branch_id,
        metadata: branch.metadata,
        createdBy: branch.created_by,
        createdAt: branch.created_at,
        updatedAt: branch.updated_at
      }));

      res.json({
        success: true,
        data,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch branches',
        error: error.message
      });
    }
  },

  // GET /api/v1/legislations/:legislationId/branches/:id - Get single branch
  async getById(req, res) {
    try {
      const { id } = req.params;

      const branch = await LegislationBranch.findByPk(id, {
        include: [
          { model: Legislation, as: 'legislation' }
        ]
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      res.json({
        success: true,
        data: branch
      });
    } catch (error) {
      console.error('Error fetching branch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch branch',
        error: error.message
      });
    }
  },

  // POST /api/v1/legislations/:legislationId/branches - Create new branch
  async create(req, res) {
    try {
      const { legislationId } = req.params;
      const {
        name,
        description,
        parent_branch_id,
        base_version_id,
        metadata
      } = req.body;

      // Verify legislation exists
      const legislation = await Legislation.findByPk(legislationId);
      if (!legislation) {
        return res.status(404).json({
          success: false,
          message: 'Legislation not found'
        });
      }

      const branch = await LegislationBranch.create({
        legislation_id: legislationId,
        name,
        description,
        status: 'active',
        parent_branch_id,
        base_version_id,
        is_main: false,
        metadata: metadata || {},
        created_by: req.user?.id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Created new branch: ${name}`,
        change_type: 'created',
        legislation_id: legislationId,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'branch', id: branch.id, title: name }]
      });

      res.status(201).json({
        success: true,
        data: branch,
        message: 'Branch created successfully'
      });
    } catch (error) {
      console.error('Error creating branch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create branch',
        error: error.message
      });
    }
  },

  // PUT /api/v1/legislations/:legislationId/branches/:id - Update branch
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const branch = await LegislationBranch.findByPk(id);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Store previous values
      const previousValues = branch.toJSON();

      await branch.update(updates);

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Updated branch: ${branch.name}`,
        change_type: 'updated',
        previous_values: previousValues,
        new_values: updates,
        legislation_id: branch.legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'branch', id: branch.id, title: branch.name }]
      });

      res.json({
        success: true,
        data: branch,
        message: 'Branch updated successfully'
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update branch',
        error: error.message
      });
    }
  },

  // DELETE /api/v1/legislations/:legislationId/branches/:id - Delete branch
  async delete(req, res) {
    try {
      const { id } = req.params;

      const branch = await LegislationBranch.findByPk(id);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      if (branch.is_main) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the main branch'
        });
      }

      const branchData = branch.toJSON();

      // Create change history entry before deletion
      await ChangeHistory.create({
        date: new Date(),
        description: `Deleted branch: ${branch.name}`,
        change_type: 'deleted',
        previous_values: branchData,
        legislation_id: branch.legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'branch', id, title: branch.name }]
      });

      await branch.destroy();

      res.json({
        success: true,
        message: 'Branch deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting branch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete branch',
        error: error.message
      });
    }
  },

  // POST /api/v1/legislations/:legislationId/branches/:id/apply - Apply branch changes
  async applyBranch(req, res) {
    try {
      const { id } = req.params;
      const { apply = true } = req.body;

      const branch = await LegislationBranch.findByPk(id);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      // Update branch metadata to indicate applied status
      const metadata = branch.metadata || {};
      metadata.isApplied = apply;

      await branch.update({ metadata });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `${apply ? 'Applied' : 'Unapplied'} branch: ${branch.name}`,
        change_type: 'updated',
        legislation_id: branch.legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'branch', id: branch.id, title: branch.name }]
      });

      res.json({
        success: true,
        data: branch,
        message: `Branch ${apply ? 'applied' : 'unapplied'} successfully`
      });
    } catch (error) {
      console.error('Error applying branch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply branch',
        error: error.message
      });
    }
  },

  // POST /api/v1/legislations/:legislationId/branches/:id/merge - Merge branch
  async mergeBranch(req, res) {
    try {
      const { id } = req.params;
      const { target_branch_id } = req.body;

      const branch = await LegislationBranch.findByPk(id);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch not found'
        });
      }

      const targetBranch = await LegislationBranch.findByPk(target_branch_id);
      if (!targetBranch) {
        return res.status(404).json({
          success: false,
          message: 'Target branch not found'
        });
      }

      // Update source branch as merged
      await branch.update({
        status: 'merged',
        merged_at: new Date(),
        merged_by: req.user?.id,
        merged_into_branch_id: target_branch_id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Merged branch "${branch.name}" into "${targetBranch.name}"`,
        change_type: 'updated',
        legislation_id: branch.legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [
          { type: 'branch', id: branch.id, title: branch.name, action: 'merged_from' },
          { type: 'branch', id: targetBranch.id, title: targetBranch.name, action: 'merged_into' }
        ]
      });

      res.json({
        success: true,
        data: branch,
        message: 'Branch merged successfully'
      });
    } catch (error) {
      console.error('Error merging branch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to merge branch',
        error: error.message
      });
    }
  },

  // GET /api/v1/legislations/:legislationId/branches/timeline - Get branch timeline data
  async getTimeline(req, res) {
    try {
      const { legislationId } = req.params;

      const branches = await LegislationBranch.findAll({
        where: { legislation_id: legislationId },
        order: [['created_at', 'ASC']]
      });

      // Transform to timeline format
      const timelineData = branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        isMain: branch.is_main,
        status: branch.status,
        startDate: branch.created_at,
        endDate: branch.merged_at || (branch.status === 'active' ? null : branch.updated_at),
        mergedInto: branch.merged_into_branch_id,
        isApplied: branch.metadata?.isApplied || branch.is_main
      }));

      res.json({
        success: true,
        data: timelineData
      });
    } catch (error) {
      console.error('Error fetching branch timeline:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch branch timeline',
        error: error.message
      });
    }
  }
};

module.exports = branchController;
