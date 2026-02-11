const { Team, OrganizationMember, TeamMember, User } = require('../../models');
const { logOrgAudit } = require('../../utils/orgAudit');

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
        await TeamMember.destroy({
          where: { team_id: team.id, organization_id: req.organizationId },
        });

        if (memberIds.length > 0) {
          await TeamMember.bulkCreate(
            memberIds.map((memberId) => ({
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
              id: memberIds,
              organization_id: req.organizationId,
            },
          }
        );
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
};

module.exports = teamController;

