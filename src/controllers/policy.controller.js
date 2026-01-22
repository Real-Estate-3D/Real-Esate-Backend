// Policy Controller - CRUD operations for policies
const { Policy, ChangeHistory } = require('../models');
const { Op } = require('sequelize');

const policyController = {
  // GET /api/v1/policies - Get all policies with filtering and pagination
  async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category,
        status,
        jurisdiction,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search filter
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { rules: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Category filter
      if (category && category !== 'all') {
        where.category = category;
      }

      // Status filter
      if (status && status !== 'all') {
        where.status = status;
      }

      // Jurisdiction filter
      if (jurisdiction) {
        where.jurisdiction = jurisdiction;
      }

      const { count, rows } = await Policy.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset
      });

      // Transform data to match frontend expectations
      const data = rows.map(policy => ({
        id: policy.id,
        name: policy.name,
        category: policy.category,
        rules: policy.rules,
        fullText: policy.full_text,
        parameters: policy.parameters,
        status: policy.status,
        effectiveFrom: policy.effective_from,
        effectiveTo: policy.effective_to,
        jurisdiction: policy.jurisdiction,
        municipality: policy.municipality,
        version: policy.version,
        createdAt: policy.created_at,
        updatedAt: policy.updated_at
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
      console.error('Error fetching policies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch policies',
        error: error.message
      });
    }
  },

  // GET /api/v1/policies/:id - Get single policy
  async getById(req, res) {
    try {
      const { id } = req.params;

      const policy = await Policy.findByPk(id);

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      res.json({
        success: true,
        data: policy
      });
    } catch (error) {
      console.error('Error fetching policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch policy',
        error: error.message
      });
    }
  },

  // POST /api/v1/policies - Create new policy
  async create(req, res) {
    try {
      const {
        name,
        category,
        rules,
        full_text,
        parameters,
        status = 'active',
        effective_from,
        effective_to,
        jurisdiction,
        municipality,
        legislation_id
      } = req.body;

      const policy = await Policy.create({
        name,
        category,
        rules,
        full_text,
        parameters,
        status,
        effective_from,
        effective_to,
        jurisdiction,
        municipality,
        legislation_id,
        version: 1,
        created_by: req.user?.id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Created new policy: ${name}`,
        change_type: 'created',
        policy_id: policy.id,
        legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'policy', id: policy.id, title: name }]
      });

      res.status(201).json({
        success: true,
        data: policy,
        message: 'Policy created successfully'
      });
    } catch (error) {
      console.error('Error creating policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create policy',
        error: error.message
      });
    }
  },

  // PUT /api/v1/policies/:id - Update policy
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const policy = await Policy.findByPk(id);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Store previous values
      const previousValues = policy.toJSON();

      await policy.update({
        ...updates,
        updated_by: req.user?.id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Updated policy: ${policy.name}`,
        change_type: 'updated',
        previous_values: previousValues,
        new_values: updates,
        policy_id: policy.id,
        legislation_id: policy.legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'policy', id: policy.id, title: policy.name }]
      });

      res.json({
        success: true,
        data: policy,
        message: 'Policy updated successfully'
      });
    } catch (error) {
      console.error('Error updating policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update policy',
        error: error.message
      });
    }
  },

  // DELETE /api/v1/policies/:id - Delete policy
  async delete(req, res) {
    try {
      const { id } = req.params;

      const policy = await Policy.findByPk(id);
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      const name = policy.name;

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Deleted policy: ${name}`,
        change_type: 'deleted',
        previous_values: policy.toJSON(),
        legislation_id: policy.legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'policy', id, title: name }]
      });

      await policy.destroy();

      res.json({
        success: true,
        message: 'Policy deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete policy',
        error: error.message
      });
    }
  },

  // GET /api/v1/policies/categories - Get unique categories
  async getCategories(req, res) {
    try {
      const categories = await Policy.findAll({
        attributes: ['category'],
        group: ['category'],
        raw: true
      });

      res.json({
        success: true,
        data: categories.map(c => c.category)
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }
};

module.exports = policyController;
