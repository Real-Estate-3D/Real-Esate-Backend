const { Op } = require('sequelize');
const {
  Department,
  OrganizationMember,
  Team,
  User,
  OrgAuditLog,
  sequelize,
} = require('../../models');
const { getPagination } = require('./helpers');
const { logOrgAudit } = require('../../utils/orgAudit');

const getDepartmentMemberCount = async (organizationId, departmentId) => {
  return OrganizationMember.count({
    where: { organization_id: organizationId, department_id: departmentId },
  });
};

const getDepartmentTeamCount = async (organizationId, departmentId) => {
  return Team.count({
    where: { organization_id: organizationId, department_id: departmentId },
  });
};

const isCircularParent = async (departmentId, parentDepartmentId) => {
  if (!parentDepartmentId) return false;
  if (departmentId === parentDepartmentId) return true;

  let current = await Department.findByPk(parentDepartmentId);
  while (current) {
    if (current.parent_department_id === departmentId) return true;
    if (!current.parent_department_id) return false;
    current = await Department.findByPk(current.parent_department_id);
  }
  return false;
};

const departmentController = {
  async getDepartments(req, res) {
    try {
      const { search, status } = req.query;
      const { page, limit, offset } = getPagination(req.query);

      const where = {
        organization_id: req.organizationId,
      };

      if (search) {
        where[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }];
      }
      if (status && status !== 'all') {
        where.status = status;
      }

      const { rows, count } = await Department.findAndCountAll({
        where,
        include: [
          {
            model: OrganizationMember,
            as: 'headMember',
            include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'display_name', 'email'] }],
          },
        ],
        offset,
        limit,
        order: [['updated_at', 'DESC']],
      });

      const data = await Promise.all(
        rows.map(async (department) => ({
          id: department.id,
          name: department.name,
          status: department.status,
          headMember: department.headMember
            ? {
                id: department.headMember.id,
                userId: department.headMember.user_id,
                name:
                  department.headMember.user?.display_name ||
                  `${department.headMember.user?.first_name || ''} ${department.headMember.user?.last_name || ''}`.trim(),
                email: department.headMember.user?.email,
              }
            : null,
          parentDepartmentId: department.parent_department_id,
          teamCount: await getDepartmentTeamCount(req.organizationId, department.id),
          peopleAssigned: await getDepartmentMemberCount(req.organizationId, department.id),
          updatedAt: department.updated_at,
          createdAt: department.created_at,
        }))
      );

      res.json({
        success: true,
        data,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch departments',
        error: error.message,
      });
    }
  },

  async createDepartment(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { name, status = 'active', headMemberId = null, parentDepartmentId = null } = req.body;
      if (!name || !String(name).trim()) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Department name is required' });
      }

      if (parentDepartmentId) {
        const parent = await Department.findOne({
          where: { id: parentDepartmentId, organization_id: req.organizationId },
          transaction,
        });
        if (!parent) {
          await transaction.rollback();
          return res.status(404).json({ success: false, message: 'Parent department not found' });
        }
      }

      const department = await Department.create(
        {
          organization_id: req.organizationId,
          name: String(name).trim(),
          status,
          head_member_id: headMemberId || null,
          parent_department_id: parentDepartmentId || null,
          metadata: {},
        },
        { transaction }
      );

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'department',
        entityId: department.id,
        departmentId: department.id,
        action: 'created',
        message: `Department ${department.name} created`,
        newValues: department.toJSON(),
      });

      await transaction.commit();

      res.status(201).json({
        success: true,
        data: department,
        message: 'Department created successfully',
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: 'Failed to create department',
        error: error.message,
      });
    }
  },

  async getDepartmentById(req, res) {
    try {
      const department = await Department.findOne({
        where: {
          id: req.params.departmentId,
          organization_id: req.organizationId,
        },
        include: [
          {
            model: OrganizationMember,
            as: 'headMember',
            include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'display_name', 'email'] }],
          },
          { model: Department, as: 'parentDepartment' },
          { model: Department, as: 'childDepartments' },
          {
            model: Team,
            as: 'teams',
            include: [
              {
                model: OrganizationMember,
                as: 'leadMember',
                include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'display_name', 'email'] }],
              },
            ],
          },
        ],
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Department not found',
        });
      }

      const people = await OrganizationMember.findAll({
        where: { organization_id: req.organizationId, department_id: department.id },
        include: [
          { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'display_name', 'email', 'is_active'] },
          { model: Team, as: 'team', attributes: ['id', 'name'] },
        ],
      });

      res.json({
        success: true,
        data: {
          ...department.toJSON(),
          people,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch department details',
        error: error.message,
      });
    }
  },

  async updateDepartment(req, res) {
    try {
      const department = await Department.findOne({
        where: { id: req.params.departmentId, organization_id: req.organizationId },
      });
      if (!department) {
        return res.status(404).json({ success: false, message: 'Department not found' });
      }

      const previous = department.toJSON();
      const updates = {};
      const { name, status, headMemberId, parentDepartmentId } = req.body;

      if (name !== undefined) updates.name = String(name || '').trim();
      if (status !== undefined) updates.status = status;
      if (headMemberId !== undefined) updates.head_member_id = headMemberId || null;
      if (parentDepartmentId !== undefined) {
        if (await isCircularParent(department.id, parentDepartmentId || null)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid parent department selection (circular relationship)',
          });
        }
        updates.parent_department_id = parentDepartmentId || null;
      }

      await department.update(updates);

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'department',
        entityId: department.id,
        departmentId: department.id,
        action: 'updated',
        message: `Department ${department.name} updated`,
        previousValues: previous,
        newValues: department.toJSON(),
      });

      res.json({
        success: true,
        data: department,
        message: 'Department updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update department',
        error: error.message,
      });
    }
  },

  async deleteDepartment(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const department = await Department.findOne({
        where: { id: req.params.departmentId, organization_id: req.organizationId },
        transaction,
      });
      if (!department) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Department not found' });
      }

      const previous = department.toJSON();

      await OrganizationMember.update(
        { department_id: null },
        { where: { organization_id: req.organizationId, department_id: department.id }, transaction }
      );
      await Team.destroy({
        where: { organization_id: req.organizationId, department_id: department.id },
        transaction,
      });

      await department.destroy({ transaction });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'department',
        entityId: department.id,
        departmentId: department.id,
        action: 'deleted',
        message: `Department ${department.name} deleted`,
        previousValues: previous,
      });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: 'Failed to delete department',
        error: error.message,
      });
    }
  },

  async getDepartmentChangeHistory(req, res) {
    try {
      const { page, limit, offset } = getPagination(req.query, 20, 200);

      const { rows, count } = await OrgAuditLog.findAndCountAll({
        where: {
          organization_id: req.organizationId,
          department_id: req.params.departmentId,
        },
        order: [['created_at', 'DESC']],
        offset,
        limit,
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch department change history',
        error: error.message,
      });
    }
  },

  async getDepartmentTeams(req, res) {
    try {
      const teams = await Team.findAll({
        where: {
          organization_id: req.organizationId,
          department_id: req.params.departmentId,
        },
        include: [
          {
            model: OrganizationMember,
            as: 'leadMember',
            include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'display_name', 'email'] }],
          },
        ],
        order: [['updated_at', 'DESC']],
      });

      const data = await Promise.all(
        teams.map(async (team) => ({
          ...team.toJSON(),
          memberCount: await OrganizationMember.count({
            where: { organization_id: req.organizationId, team_id: team.id },
          }),
        }))
      );

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch department teams',
        error: error.message,
      });
    }
  },

  async createDepartmentTeam(req, res) {
    try {
      const department = await Department.findOne({
        where: { id: req.params.departmentId, organization_id: req.organizationId },
      });

      if (!department) {
        return res.status(404).json({ success: false, message: 'Department not found' });
      }

      const { name, leadMemberId = null, status = 'active' } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Team name is required' });
      }

      const team = await Team.create({
        organization_id: req.organizationId,
        department_id: req.params.departmentId,
        name: String(name).trim(),
        lead_member_id: leadMemberId,
        status,
      });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'team',
        entityId: team.id,
        departmentId: req.params.departmentId,
        action: 'created',
        message: `Team ${team.name} created`,
        newValues: team.toJSON(),
      });

      res.status(201).json({
        success: true,
        data: team,
        message: 'Team created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create team',
        error: error.message,
      });
    }
  },
};

module.exports = departmentController;
