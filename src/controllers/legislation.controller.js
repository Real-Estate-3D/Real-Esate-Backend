// Legislation Controller - CRUD operations for legislations (Processes)
const { Legislation, ZoningLaw, Policy, ChangeHistory, Workflow } = require('../models');
const { Op } = require('sequelize');

const legislationController = {
  // GET /api/v1/legislations - Get all legislations with filtering and pagination
  async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        type,
        jurisdiction,
        sortBy = 'updated_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search filter
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { process: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Status filter
      if (status && status !== 'all') {
        where.status = status;
      }

      // Type filter
      if (type && type !== 'all') {
        where.legislation_type = type;
      }

      // Jurisdiction filter
      if (jurisdiction) {
        where.jurisdiction = jurisdiction;
      }

      const { count, rows } = await Legislation.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset,
        include: [
          { model: Workflow, as: 'workflow', attributes: ['id', 'name'] }
        ]
      });

      // Transform data to match frontend expectations
      const data = rows.map(leg => ({
        id: leg.id,
        title: leg.title,
        process: leg.process,
        status: leg.status,
        effectiveFrom: leg.effective_from,
        legislationType: leg.legislation_type,
        jurisdiction: leg.jurisdiction,
        municipality: leg.municipality,
        description: leg.description,
        workflow: leg.workflow,
        createdAt: leg.created_at,
        updatedAt: leg.updated_at
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
      console.error('Error fetching legislations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch legislations',
        error: error.message
      });
    }
  },

  // GET /api/v1/legislations/:id - Get single legislation
  async getById(req, res) {
    try {
      const { id } = req.params;

      const legislation = await Legislation.findByPk(id, {
        include: [
          { model: ZoningLaw, as: 'zoningLaws' },
          { model: Policy, as: 'policies' },
          { model: Workflow, as: 'workflow' },
          { model: ChangeHistory, as: 'changeHistory', limit: 10, order: [['date', 'DESC']] }
        ]
      });

      if (!legislation) {
        return res.status(404).json({
          success: false,
          message: 'Legislation not found'
        });
      }

      res.json({
        success: true,
        data: legislation
      });
    } catch (error) {
      console.error('Error fetching legislation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch legislation',
        error: error.message
      });
    }
  },

  // POST /api/v1/legislations - Create new legislation
  async create(req, res) {
    try {
      const {
        title,
        process,
        status = 'draft',
        legislation_type,
        effective_from,
        effective_to,
        jurisdiction,
        municipality,
        description,
        full_text,
        workflow_id
      } = req.body;

      const legislation = await Legislation.create({
        title,
        process,
        status,
        legislation_type,
        effective_from,
        effective_to,
        jurisdiction,
        municipality,
        description,
        full_text,
        workflow_id,
        created_by: req.user?.id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Created new legislation: ${title}`,
        change_type: 'created',
        legislation_id: legislation.id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System'
      });

      res.status(201).json({
        success: true,
        data: legislation,
        message: 'Legislation created successfully'
      });
    } catch (error) {
      console.error('Error creating legislation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create legislation',
        error: error.message
      });
    }
  },

  // PUT /api/v1/legislations/:id - Update legislation
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const legislation = await Legislation.findByPk(id);
      if (!legislation) {
        return res.status(404).json({
          success: false,
          message: 'Legislation not found'
        });
      }

      // Store previous values for change history
      const previousValues = legislation.toJSON();

      // Update legislation
      await legislation.update({
        ...updates,
        updated_by: req.user?.id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Updated legislation: ${legislation.title}`,
        change_type: 'updated',
        previous_values: previousValues,
        new_values: updates,
        legislation_id: legislation.id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System'
      });

      res.json({
        success: true,
        data: legislation,
        message: 'Legislation updated successfully'
      });
    } catch (error) {
      console.error('Error updating legislation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update legislation',
        error: error.message
      });
    }
  },

  // DELETE /api/v1/legislations/:id - Delete legislation
  async delete(req, res) {
    try {
      const { id } = req.params;

      const legislation = await Legislation.findByPk(id);
      if (!legislation) {
        return res.status(404).json({
          success: false,
          message: 'Legislation not found'
        });
      }

      const title = legislation.title;

      // Create change history entry before deletion
      await ChangeHistory.create({
        date: new Date(),
        description: `Deleted legislation: ${title}`,
        change_type: 'deleted',
        previous_values: legislation.toJSON(),
        user_id: req.user?.id,
        user_name: req.user?.name || 'System'
      });

      await legislation.destroy();

      res.json({
        success: true,
        message: 'Legislation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting legislation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete legislation',
        error: error.message
      });
    }
  },

  // POST /api/v1/legislations/:id/publish - Publish legislation
  async publish(req, res) {
    try {
      const { id } = req.params;

      const legislation = await Legislation.findByPk(id);
      if (!legislation) {
        return res.status(404).json({
          success: false,
          message: 'Legislation not found'
        });
      }

      await legislation.update({
        status: 'active',
        updated_by: req.user?.id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Published legislation: ${legislation.title}`,
        change_type: 'published',
        legislation_id: legislation.id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System'
      });

      res.json({
        success: true,
        data: legislation,
        message: 'Legislation published successfully'
      });
    } catch (error) {
      console.error('Error publishing legislation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish legislation',
        error: error.message
      });
    }
  }
};

module.exports = legislationController;
