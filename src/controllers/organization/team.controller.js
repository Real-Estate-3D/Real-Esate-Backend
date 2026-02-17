const { Op } = require('sequelize');
const { Team, OrganizationMember, TeamMember, User, OrgAuditLog } = require('../../models');
const { logOrgAudit } = require('../../utils/orgAudit');
const { getPagination } = require('./helpers');

const teamController = {
  async getTeamById(req, res) {
    try {
      const team = await Team.findOne({
        where: {
          id: req.params.teamId,
          organization_id: req.organizationId,
        },
        include: [
          {
            model: OrganizationMember,
            as: 'leadMember',
            include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'display_name', 'email'] }],
          },
          {
            model: OrganizationMember,
            as: 'teamMembers',
            include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'display_name', 'email'] }],
            through: { attributes: [] },
          },
        ],
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found',
        });
      }

      res.json({
        success: true,
        data: team,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team details',
        error: error.message,
      });
    }
  },

  async updateTeam(req, res) {
    try {
      const team = await Team.findOne({
        where: {
          id: req.params.teamId,
          organization_id: req.organizationId,
        },
      });
      if (!team) {
        return res.status(404).json({ success: false, message: 'Team not found' });
      }

      const previous = team.toJSON();
      const { name, leadMemberId, status, memberIds } = req.body;
      const updates = {};

      if (name !== undefined) updates.name = String(name || '').trim();
      if (leadMemberId !== undefined) updates.lead_member_id = leadMemberId || null;
      if (status !== undefined) updates.status = status;

      await team.update(updates);

      if (Array.isArray(memberIds)) {
        const existingTeamMembers = await TeamMember.findAll({
          where: { team_id: team.id, organization_id: req.organizationId },
          attributes: ['organization_member_id'],
        });
        const existingMemberIds = existingTeamMembers.map((item) => item.organization_member_id);
        const nextMemberIds = memberIds.filter(Boolean);
        const removedMemberIds = existingMemberIds.filter((memberId) => !nextMemberIds.includes(memberId));

        await TeamMember.destroy({
          where: { team_id: team.id, organization_id: req.organizationId },
        });

        if (nextMemberIds.length > 0) {
          await TeamMember.bulkCreate(
            nextMemberIds.map((memberId) => ({
              organization_id: req.organizationId,
              team_id: team.id,
              organization_member_id: memberId,
            }))
          );
        }

        await OrganizationMember.update(
          { team_id: team.id },
          {
            where: {
              id: nextMemberIds,
              organization_id: req.organizationId,
            },
          }
        );

        if (removedMemberIds.length > 0) {
          await OrganizationMember.update(
            { team_id: null },
            {
              where: {
                id: removedMemberIds,
                organization_id: req.organizationId,
                team_id: team.id,
              },
            }
          );
        }
      }

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'team',
        entityId: team.id,
        departmentId: team.department_id,
        action: 'updated',
        message: `Team ${team.name} updated`,
        previousValues: previous,
        newValues: team.toJSON(),
      });

      res.json({
        success: true,
        data: team,
        message: 'Team updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update team',
        error: error.message,
      });
    }
  },

  async deleteTeam(req, res) {
    try {
      const team = await Team.findOne({
        where: {
          id: req.params.teamId,
          organization_id: req.organizationId,
        },
      });
      if (!team) {
        return res.status(404).json({ success: false, message: 'Team not found' });
      }

      const previous = team.toJSON();

      await OrganizationMember.update(
        { team_id: null },
        {
          where: { organization_id: req.organizationId, team_id: team.id },
        }
      );
      await TeamMember.destroy({
        where: { organization_id: req.organizationId, team_id: team.id },
      });
      await team.destroy();

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'team',
        entityId: team.id,
        departmentId: team.department_id,
        action: 'deleted',
        message: `Team ${team.name} deleted`,
        previousValues: previous,
      });

      res.json({
        success: true,
        message: 'Team deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete team',
        error: error.message,
      });
    }
  },

  async getTeamChangeHistory(req, res) {
    try {
      const team = await Team.findOne({
        where: { id: req.params.teamId, organization_id: req.organizationId },
      });
      if (!team) {
        return res.status(404).json({ success: false, message: 'Team not found' });
      }

      const { page, limit, offset } = getPagination(req.query, 20, 200);
      const search = String(req.query.search || '').trim();
      const action = String(req.query.action || '').trim();
      const where = {
        organization_id: req.organizationId,
        entity_type: 'team',
        entity_id: team.id,
      };

      if (action && action !== 'all') {
        where.action = action;
      }

      if (search) {
        where[Op.or] = [
          { message: { [Op.iLike]: `%${search}%` } },
          { action: { [Op.iLike]: `%${search}%` } },
          { actor_name: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows, count } = await OrgAuditLog.findAndCountAll({
        where,
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
        message: 'Failed to fetch team change history',
        error: error.message,
      });
    }
  },
};

module.exports = teamController;
