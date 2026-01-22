// Workflow Controller - CRUD operations for workflows
const { Workflow, WorkflowStep } = require('../models');
const { Op } = require('sequelize');

const workflowController = {
  // GET /api/v1/workflows - Get all workflows
  async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        jurisdiction
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (status && status !== 'all') {
        where.status = status;
      }

      if (jurisdiction) {
        where.jurisdiction = jurisdiction;
      }

      const { count, rows } = await Workflow.findAndCountAll({
        where,
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset,
        include: [
          { model: WorkflowStep, as: 'steps', order: [['step_order', 'ASC']] }
        ]
      });

      // Transform data
      const data = rows.map(wf => ({
        id: wf.id,
        name: wf.name,
        description: wf.description,
        status: wf.status,
        jurisdiction: wf.jurisdiction,
        steps: wf.steps?.map(s => ({
          id: s.id,
          name: s.name,
          stepOrder: s.step_order,
          stepType: s.step_type,
          required: s.required,
          durationDays: s.duration_days
        })) || [],
        stepsDescription: wf.steps?.map(s => s.name).join(', ') || '',
        createdAt: wf.created_at,
        updatedAt: wf.updated_at
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
      console.error('Error fetching workflows:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflows',
        error: error.message
      });
    }
  },

  // GET /api/v1/workflows/:id - Get single workflow
  async getById(req, res) {
    try {
      const { id } = req.params;

      const workflow = await Workflow.findByPk(id, {
        include: [
          { model: WorkflowStep, as: 'steps', order: [['step_order', 'ASC']] }
        ]
      });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        data: workflow
      });
    } catch (error) {
      console.error('Error fetching workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflow',
        error: error.message
      });
    }
  },

  // POST /api/v1/workflows - Create workflow
  async create(req, res) {
    try {
      const { name, description, status = 'active', jurisdiction, steps = [] } = req.body;

      const workflow = await Workflow.create({
        name,
        description,
        status,
        jurisdiction,
        created_by: req.user?.id
      });

      // Create workflow steps
      if (steps.length > 0) {
        await WorkflowStep.bulkCreate(
          steps.map((step, index) => ({
            ...step,
            workflow_id: workflow.id,
            step_order: step.step_order || index + 1
          }))
        );
      }

      // Fetch with steps
      const result = await Workflow.findByPk(workflow.id, {
        include: [{ model: WorkflowStep, as: 'steps', order: [['step_order', 'ASC']] }]
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Workflow created successfully'
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create workflow',
        error: error.message
      });
    }
  },

  // PUT /api/v1/workflows/:id - Update workflow
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, status, jurisdiction, steps } = req.body;

      const workflow = await Workflow.findByPk(id);
      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      await workflow.update({ name, description, status, jurisdiction });

      // Update steps if provided
      if (steps) {
        // Delete existing steps
        await WorkflowStep.destroy({ where: { workflow_id: id } });

        // Create new steps
        if (steps.length > 0) {
          await WorkflowStep.bulkCreate(
            steps.map((step, index) => ({
              ...step,
              workflow_id: id,
              step_order: step.step_order || index + 1
            }))
          );
        }
      }

      // Fetch updated workflow with steps
      const result = await Workflow.findByPk(id, {
        include: [{ model: WorkflowStep, as: 'steps', order: [['step_order', 'ASC']] }]
      });

      res.json({
        success: true,
        data: result,
        message: 'Workflow updated successfully'
      });
    } catch (error) {
      console.error('Error updating workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workflow',
        error: error.message
      });
    }
  },

  // DELETE /api/v1/workflows/:id - Delete workflow
  async delete(req, res) {
    try {
      const { id } = req.params;

      const workflow = await Workflow.findByPk(id);
      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      // Delete steps first
      await WorkflowStep.destroy({ where: { workflow_id: id } });
      await workflow.destroy();

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete workflow',
        error: error.message
      });
    }
  }
};

module.exports = workflowController;
