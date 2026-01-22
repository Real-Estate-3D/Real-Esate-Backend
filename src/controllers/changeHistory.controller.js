// ChangeHistory Controller - Get change history records
const { ChangeHistory, Legislation, ZoningLaw } = require('../models');
const { Op } = require('sequelize');

const changeHistoryController = {
  // GET /api/v1/change-history - Get all change history with filtering and pagination
  async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        change_type,
        date_from,
        date_to,
        legislation_id,
        zoning_law_id,
        sortBy = 'date',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      // Search filter
      if (search) {
        where.description = { [Op.iLike]: `%${search}%` };
      }

      // Change type filter
      if (change_type && change_type !== 'all') {
        where.change_type = change_type;
      }

      // Date range filter
      if (date_from || date_to) {
        where.date = {};
        if (date_from) {
          where.date[Op.gte] = date_from;
        }
        if (date_to) {
          where.date[Op.lte] = date_to;
        }
      }

      // Legislation filter
      if (legislation_id) {
        where.legislation_id = legislation_id;
      }

      // Zoning law filter
      if (zoning_law_id) {
        where.zoning_law_id = zoning_law_id;
      }

      const { count, rows } = await ChangeHistory.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset,
        include: [
          { model: Legislation, as: 'legislation', attributes: ['id', 'title'] },
          { model: ZoningLaw, as: 'zoningLaw', attributes: ['id', 'title', 'number'] }
        ]
      });

      // Transform data to match frontend expectations
      const data = rows.map(history => ({
        id: history.id,
        date: history.date,
        description: history.description,
        changeType: history.change_type,
        affectedEntities: history.affected_entities || [],
        legislation: history.legislation,
        zoningLaw: history.zoningLaw,
        userName: history.user_name,
        createdAt: history.created_at
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
      console.error('Error fetching change history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch change history',
        error: error.message
      });
    }
  },

  // GET /api/v1/change-history/:id - Get single change history record
  async getById(req, res) {
    try {
      const { id } = req.params;

      const history = await ChangeHistory.findByPk(id, {
        include: [
          { model: Legislation, as: 'legislation' },
          { model: ZoningLaw, as: 'zoningLaw' }
        ]
      });

      if (!history) {
        return res.status(404).json({
          success: false,
          message: 'Change history record not found'
        });
      }

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error fetching change history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch change history',
        error: error.message
      });
    }
  },

  // GET /api/v1/change-history/legislation/:id - Get history for a legislation
  async getByLegislation(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await ChangeHistory.findAndCountAll({
        where: { legislation_id: id },
        order: [['date', 'DESC']],
        limit: parseInt(limit),
        offset,
        include: [
          { model: ZoningLaw, as: 'zoningLaw', attributes: ['id', 'title', 'number'] }
        ]
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching change history for legislation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch change history',
        error: error.message
      });
    }
  },

  // GET /api/v1/change-history/zoning-law/:id - Get history for a zoning law
  async getByZoningLaw(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await ChangeHistory.findAndCountAll({
        where: { zoning_law_id: id },
        order: [['date', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching change history for zoning law:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch change history',
        error: error.message
      });
    }
  }
};

module.exports = changeHistoryController;
