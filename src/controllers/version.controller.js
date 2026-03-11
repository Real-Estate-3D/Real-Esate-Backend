// Version Controller - Manage legislation version history
const { LegislationVersion, Legislation, User } = require('../models');

const versionController = {
  // GET /api/v1/legislations/:legislationId/versions - List all versions
  async getAll(req, res) {
    try {
      const { legislationId } = req.params;
      const {
        page = 1,
        limit = 20,
        sortBy = 'version_number',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Verify legislation exists
      const legislation = await Legislation.findByPk(legislationId);
      if (!legislation) {
        return res.status(404).json({
          success: false,
          message: 'Legislation not found'
        });
      }

      const { count, rows } = await LegislationVersion.findAndCountAll({
        where: { legislation_id: legislationId },
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ]
      });

      const data = rows.map(v => ({
        id: v.id,
        legislationId: v.legislation_id,
        versionNumber: v.version_number,
        title: v.title,
        content: v.content,
        changesSummary: v.changes_summary,
        snapshot: v.snapshot,
        status: v.status,
        createdBy: v.created_by,
        approvedBy: v.approved_by,
        approvedAt: v.approved_at,
        creator: v.creator
          ? { id: v.creator.id, name: v.creator.name, email: v.creator.email }
          : null,
        createdAt: v.created_at,
        updatedAt: v.updated_at
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
      console.error('Error fetching versions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch versions',
        error: error.message
      });
    }
  },

  // GET /api/v1/legislations/:legislationId/versions/:versionId - Get single version
  async getById(req, res) {
    try {
      const { versionId } = req.params;

      const version = await LegislationVersion.findByPk(versionId, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ]
      });

      if (!version) {
        return res.status(404).json({
          success: false,
          message: 'Version not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: version.id,
          legislationId: version.legislation_id,
          versionNumber: version.version_number,
          title: version.title,
          content: version.content,
          changesSummary: version.changes_summary,
          snapshot: version.snapshot,
          status: version.status,
          createdBy: version.created_by,
          approvedBy: version.approved_by,
          approvedAt: version.approved_at,
          creator: version.creator
            ? { id: version.creator.id, name: version.creator.name, email: version.creator.email }
            : null,
          createdAt: version.created_at,
          updatedAt: version.updated_at
        }
      });
    } catch (error) {
      console.error('Error fetching version:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch version',
        error: error.message
      });
    }
  },

  // POST /api/v1/legislations/:legislationId/versions - Create a new version snapshot
  async create(req, res) {
    try {
      const { legislationId } = req.params;
      const { title, content, changes_summary } = req.body;

      // Verify legislation exists
      const legislation = await Legislation.findByPk(legislationId);
      if (!legislation) {
        return res.status(404).json({
          success: false,
          message: 'Legislation not found'
        });
      }

      // Get next version number
      const lastVersion = await LegislationVersion.findOne({
        where: { legislation_id: legislationId },
        order: [['version_number', 'DESC']]
      });
      const nextVersionNumber = lastVersion ? lastVersion.version_number + 1 : 1;

      const version = await LegislationVersion.create({
        legislation_id: legislationId,
        version_number: nextVersionNumber,
        title: title || legislation.title,
        content: content || legislation.full_text,
        changes_summary,
        snapshot: legislation.toJSON(),
        status: 'draft',
        created_by: req.user?.id
      });

      res.status(201).json({
        success: true,
        data: {
          id: version.id,
          legislationId: version.legislation_id,
          versionNumber: version.version_number,
          title: version.title,
          content: version.content,
          changesSummary: version.changes_summary,
          snapshot: version.snapshot,
          status: version.status,
          createdBy: version.created_by,
          createdAt: version.created_at
        },
        message: 'Version created successfully'
      });
    } catch (error) {
      console.error('Error creating version:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create version',
        error: error.message
      });
    }
  }
};

module.exports = versionController;
