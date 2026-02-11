// ZoningLaw Controller - CRUD operations for zoning laws
const { ZoningLaw, ChangeHistory, GISSchedule } = require('../models');
const { Op } = require('sequelize');
const { extractGeometry, validateGeometryWithinJurisdiction } = require('../utils/jurisdictionValidation');

const zoningLawController = {
  // GET /api/v1/zoning-laws - Get all zoning laws with filtering and pagination
  async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        type,
        status,
        municipality,
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
          { number: { [Op.iLike]: `%${search}%` } },
          { zone_code: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Type filter
      if (type && type !== 'all') {
        where.type = type;
      }

      // Status filter
      if (status && status !== 'all') {
        where.status = status;
      }

      // Municipality filter
      if (municipality) {
        where.municipality = municipality;
      }

      // Jurisdiction filter
      if (jurisdiction) {
        where.jurisdiction = jurisdiction;
      }

      const { count, rows } = await ZoningLaw.findAndCountAll({
        where,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset
      });

      // Transform data to match frontend expectations
      const data = rows.map(law => ({
        id: law.id,
        title: law.title,
        number: law.number,
        type: law.type,
        effectiveFrom: law.effective_from,
        validityStatus: law.validity_status,
        status: law.status,
        zoneCode: law.zone_code,
        zoneName: law.zone_name,
        description: law.description,
        parameters: law.parameters,
        municipality: law.municipality,
        jurisdiction: law.jurisdiction,
        version: law.version,
        createdAt: law.created_at,
        updatedAt: law.updated_at
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
      console.error('Error fetching zoning laws:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch zoning laws',
        error: error.message
      });
    }
  },

  // GET /api/v1/zoning-laws/:id - Get single zoning law
  async getById(req, res) {
    try {
      const { id } = req.params;

      const zoningLaw = await ZoningLaw.findByPk(id, {
        include: [
          { model: GISSchedule, as: 'gisSchedules' },
          { model: ChangeHistory, as: 'changeHistory', limit: 10, order: [['date', 'DESC']] }
        ]
      });

      if (!zoningLaw) {
        return res.status(404).json({
          success: false,
          message: 'Zoning law not found'
        });
      }

      res.json({
        success: true,
        data: zoningLaw
      });
    } catch (error) {
      console.error('Error fetching zoning law:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch zoning law',
        error: error.message
      });
    }
  },

  // POST /api/v1/zoning-laws - Create new zoning law
  async create(req, res) {
    try {
      const {
        title,
        number,
        type = 'Residential',
        effective_from,
        effective_to,
        validity_status,
        status = 'Draft',
        zone_code,
        zone_name,
        description,
        full_text,
        parameters,
        geometry,
        municipality,
        jurisdiction,
        legislation_id
      } = req.body;

      const normalizedGeometry = extractGeometry(geometry);
      if (normalizedGeometry) {
        if (!req.user?.jurisdiction) {
          return res.status(422).json({
            success: false,
            message: 'User jurisdiction is required before saving polygon geometry',
          });
        }

        const validation = await validateGeometryWithinJurisdiction({
          geometry: normalizedGeometry,
          jurisdictionName: req.user.jurisdiction,
        });

        if (!validation.valid) {
          return res.status(422).json({
            success: false,
            message: validation.reason,
            validation,
          });
        }
      }

      const zoningLaw = await ZoningLaw.create({
        title,
        number,
        type,
        effective_from,
        effective_to,
        validity_status,
        status,
        zone_code,
        zone_name,
        description,
        full_text,
        parameters,
        geometry: normalizedGeometry || geometry,
        municipality,
        jurisdiction,
        legislation_id,
        version: 1,
        created_by: req.user?.id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Created new zoning law: ${title}`,
        change_type: 'created',
        zoning_law_id: zoningLaw.id,
        legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'zoning_law', id: zoningLaw.id, title }]
      });

      res.status(201).json({
        success: true,
        data: zoningLaw,
        message: 'Zoning law created successfully'
      });
    } catch (error) {
      console.error('Error creating zoning law:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create zoning law',
        error: error.message
      });
    }
  },

  // PUT /api/v1/zoning-laws/:id - Update zoning law
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const normalizedGeometry = extractGeometry(updates.geometry);
      if (normalizedGeometry) {
        if (!req.user?.jurisdiction) {
          return res.status(422).json({
            success: false,
            message: 'User jurisdiction is required before saving polygon geometry',
          });
        }

        const validation = await validateGeometryWithinJurisdiction({
          geometry: normalizedGeometry,
          jurisdictionName: req.user.jurisdiction,
        });

        if (!validation.valid) {
          return res.status(422).json({
            success: false,
            message: validation.reason,
            validation,
          });
        }
        updates.geometry = normalizedGeometry;
      }

      const zoningLaw = await ZoningLaw.findByPk(id);
      if (!zoningLaw) {
        return res.status(404).json({
          success: false,
          message: 'Zoning law not found'
        });
      }

      // Store previous values for change history
      const previousValues = zoningLaw.toJSON();

      // Update zoning law
      await zoningLaw.update({
        ...updates,
        updated_by: req.user?.id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Updated zoning law: ${zoningLaw.title}`,
        change_type: 'updated',
        previous_values: previousValues,
        new_values: updates,
        zoning_law_id: zoningLaw.id,
        legislation_id: zoningLaw.legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'zoning_law', id: zoningLaw.id, title: zoningLaw.title }]
      });

      res.json({
        success: true,
        data: zoningLaw,
        message: 'Zoning law updated successfully'
      });
    } catch (error) {
      console.error('Error updating zoning law:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update zoning law',
        error: error.message
      });
    }
  },

  // DELETE /api/v1/zoning-laws/:id - Delete zoning law
  async delete(req, res) {
    try {
      const { id } = req.params;

      const zoningLaw = await ZoningLaw.findByPk(id);
      if (!zoningLaw) {
        return res.status(404).json({
          success: false,
          message: 'Zoning law not found'
        });
      }

      const title = zoningLaw.title;
      const legislationId = zoningLaw.legislation_id;

      // Create change history entry before deletion
      await ChangeHistory.create({
        date: new Date(),
        description: `Deleted zoning law: ${title}`,
        change_type: 'deleted',
        previous_values: zoningLaw.toJSON(),
        legislation_id: legislationId,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [{ type: 'zoning_law', id, title }]
      });

      await zoningLaw.destroy();

      res.json({
        success: true,
        message: 'Zoning law deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting zoning law:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete zoning law',
        error: error.message
      });
    }
  },

  // POST /api/v1/zoning-laws/:id/duplicate - Duplicate zoning law
  async duplicate(req, res) {
    try {
      const { id } = req.params;

      const original = await ZoningLaw.findByPk(id);
      if (!original) {
        return res.status(404).json({
          success: false,
          message: 'Zoning law not found'
        });
      }

      // Create duplicate with modified title
      const duplicate = await ZoningLaw.create({
        title: `${original.title} (Copy)`,
        number: `${original.number}-COPY`,
        type: original.type,
        effective_from: null, // Reset dates
        effective_to: null,
        validity_status: null,
        status: 'Draft',
        zone_code: original.zone_code,
        zone_name: original.zone_name,
        description: original.description,
        full_text: original.full_text,
        parameters: original.parameters,
        geometry: original.geometry,
        municipality: original.municipality,
        jurisdiction: original.jurisdiction,
        legislation_id: original.legislation_id,
        parent_id: original.id,
        version: 1,
        created_by: req.user?.id
      });

      // Create change history entry
      await ChangeHistory.create({
        date: new Date(),
        description: `Duplicated zoning law: ${original.title}`,
        change_type: 'created',
        zoning_law_id: duplicate.id,
        legislation_id: original.legislation_id,
        user_id: req.user?.id,
        user_name: req.user?.name || 'System',
        affected_entities: [
          { type: 'zoning_law', id: duplicate.id, title: duplicate.title },
          { type: 'zoning_law', id: original.id, title: original.title, relation: 'duplicated_from' }
        ]
      });

      res.status(201).json({
        success: true,
        data: duplicate,
        message: 'Zoning law duplicated successfully'
      });
    } catch (error) {
      console.error('Error duplicating zoning law:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate zoning law',
        error: error.message
      });
    }
  },

  // GET /api/v1/zoning-laws/zone-code/:code - Get by zone code
  async getByZoneCode(req, res) {
    try {
      const { code } = req.params;

      const zoningLaws = await ZoningLaw.findAll({
        where: { zone_code: code },
        order: [['version', 'DESC']]
      });

      res.json({
        success: true,
        data: zoningLaws
      });
    } catch (error) {
      console.error('Error fetching zoning laws by zone code:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch zoning laws',
        error: error.message
      });
    }
  },

  // GET /api/v1/zoning-laws/municipality/:municipality - Get by municipality
  async getByMunicipality(req, res) {
    try {
      const { municipality } = req.params;

      const zoningLaws = await ZoningLaw.findAll({
        where: { municipality: { [Op.iLike]: `%${municipality}%` } },
        order: [['title', 'ASC']]
      });

      res.json({
        success: true,
        data: zoningLaws
      });
    } catch (error) {
      console.error('Error fetching zoning laws by municipality:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch zoning laws',
        error: error.message
      });
    }
  }
};

module.exports = zoningLawController;
