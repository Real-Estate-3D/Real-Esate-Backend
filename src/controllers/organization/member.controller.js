const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  OrganizationMember,
  User,
  Department,
  Team,
  Position,
  OrgRole,
  Invitation,
  TeamMember,
  sequelize,
} = require('../../models');
const { getPagination, generateInviteToken } = require('./helpers');
const { logOrgAudit } = require('../../utils/orgAudit');

const getDisplayName = (user) =>
  user?.display_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || '';

const uuidPattern = /^[0-9a-fA-F-]{36}$/;

const findByIdOrName = async (Model, organizationId, value, nameField = 'name') => {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  let record = null;
  if (uuidPattern.test(text)) {
    record = await Model.findOne({ where: { id: text, organization_id: organizationId } });
  }
  if (!record) {
    record = await Model.findOne({
      where: {
        organization_id: organizationId,
        [nameField]: { [Op.iLike]: text },
      },
    });
  }
  return record;
};

const normalizeIdempotencyKey = (value) => {
  const normalized = String(value || '').trim();
  return normalized.length ? normalized.slice(0, 120) : '';
};

const memberController = {
  async getMembers(req, res) {
    try {
      const { search, status, departmentId, teamId } = req.query;
      const { page, limit, offset } = getPagination(req.query, 10, 100);

      const where = { organization_id: req.organizationId };
      if (status && status !== 'all') where.status = status;
      if (departmentId) where.department_id = departmentId;
      if (teamId) where.team_id = teamId;

      const userWhere = {};
      if (search) {
        userWhere[Op.or] = [
          { email: { [Op.iLike]: `%${search}%` } },
          { first_name: { [Op.iLike]: `%${search}%` } },
          { last_name: { [Op.iLike]: `%${search}%` } },
          { display_name: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows, count } = await OrganizationMember.findAndCountAll({
        where,
        include: [
          { model: User, as: 'user', where: userWhere, required: !!search, attributes: ['id', 'email', 'first_name', 'last_name', 'display_name', 'is_active'] },
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: Team, as: 'team', attributes: ['id', 'name'] },
          { model: Position, as: 'position', attributes: ['id', 'name'] },
          { model: OrgRole, as: 'orgRole', attributes: ['id', 'name'] },
        ],
        order: [['updated_at', 'DESC']],
        offset,
        limit,
      });

      const data = rows.map((member) => ({
        id: member.id,
        userId: member.user_id,
        name: getDisplayName(member.user),
        email: member.user?.email || '',
        status: member.status,
        department: member.department ? { id: member.department.id, name: member.department.name } : null,
        team: member.team ? { id: member.team.id, name: member.team.name } : null,
        position: member.position ? { id: member.position.id, name: member.position.name } : null,
        role: member.orgRole ? { id: member.orgRole.id, name: member.orgRole.name } : null,
        reportsToMemberId: member.reports_to_member_id,
        isOrgAdmin: member.is_org_admin,
        invitedAt: member.invited_at,
        deactivatedAt: member.deactivated_at,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      }));

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
        message: 'Failed to fetch members',
        error: error.message,
      });
    }
  },

  async getMemberById(req, res) {
    try {
      const member = await OrganizationMember.findOne({
        where: {
          id: req.params.memberId,
          organization_id: req.organizationId,
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name', 'display_name', 'is_active'] },
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: Team, as: 'team', attributes: ['id', 'name'] },
          { model: Position, as: 'position', attributes: ['id', 'name'] },
          { model: OrgRole, as: 'orgRole', attributes: ['id', 'name'] },
        ],
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
        });
      }

      res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch member details',
        error: error.message,
      });
    }
  },

  async updateMember(req, res) {
    try {
      const member = await OrganizationMember.findOne({
        where: { id: req.params.memberId, organization_id: req.organizationId },
        include: [{ model: User, as: 'user' }],
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const previous = member.toJSON();
      const payload = req.body || {};

      if (payload.email || payload.firstName || payload.lastName) {
        const userUpdates = {};
        if (payload.email) userUpdates.email = payload.email.trim().toLowerCase();
        if (payload.firstName !== undefined) userUpdates.first_name = payload.firstName;
        if (payload.lastName !== undefined) userUpdates.last_name = payload.lastName;
        if (Object.keys(userUpdates).length) {
          await member.user.update(userUpdates);
        }
      }

      const updates = {};
      let selectedTeam = null;

      if (payload.teamId !== undefined && payload.teamId) {
        selectedTeam = await findByIdOrName(Team, req.organizationId, payload.teamId);
        if (!selectedTeam) {
          return res.status(404).json({ success: false, message: 'Team not found' });
        }
      }

      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.departmentId !== undefined) updates.department_id = payload.departmentId || null;
      if (payload.teamId !== undefined) {
        updates.team_id = selectedTeam ? selectedTeam.id : null;
        if (selectedTeam) {
          updates.department_id = selectedTeam.department_id;
        }
      }
      if (payload.positionId !== undefined) updates.position_id = payload.positionId || null;
      if (payload.roleId !== undefined) updates.org_role_id = payload.roleId || null;

      if (Object.keys(updates).length) {
        await member.update(updates);
      }

      if (updates.team_id !== undefined) {
        await TeamMember.destroy({
          where: { organization_id: req.organizationId, organization_member_id: member.id },
        });
        if (updates.team_id) {
          await TeamMember.create({
            organization_id: req.organizationId,
            team_id: updates.team_id,
            organization_member_id: member.id,
          });
        }
      }

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'member',
        entityId: member.id,
        departmentId: member.department_id,
        action: 'updated',
        message: `Member ${getDisplayName(member.user)} updated`,
        previousValues: previous,
        newValues: member.toJSON(),
      });

      res.json({
        success: true,
        data: member,
        message: 'Member updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update member',
        error: error.message,
      });
    }
  },

  async inviteBulk(req, res) {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      if (!rows.length) {
        return res.status(400).json({
          success: false,
          message: 'rows array is required',
        });
      }

      const idempotencyKey = normalizeIdempotencyKey(
        req.headers['x-idempotency-key'] || req.body?.idempotencyKey
      );
      const seenEmails = new Set();
      const deduplicatedRows = [];
      let duplicateEmailCount = 0;

      for (const row of rows) {
        const email = String(row?.email || '')
          .trim()
          .toLowerCase();
        if (!email) {
          deduplicatedRows.push(row);
          continue;
        }
        if (seenEmails.has(email)) {
          duplicateEmailCount += 1;
          continue;
        }
        seenEmails.add(email);
        deduplicatedRows.push(row);
      }

      const results = [];
      let successCount = 0;
      let failedCount = 0;
      let reusedCount = 0;

      for (const row of deduplicatedRows) {
        const email = String(row.email || '').trim().toLowerCase();
        if (!email) {
          failedCount += 1;
          results.push({ success: false, email: row.email || '', error: 'Email is required' });
          continue;
        }

        try {
          if (idempotencyKey) {
            const existingInvitation = await Invitation.findOne({
              where: {
                organization_id: req.organizationId,
                email,
                invited_by: req.user.id,
                status: 'pending',
              },
              order: [['created_at', 'DESC']],
            });

            if (existingInvitation?.metadata?.idempotencyKey === idempotencyKey) {
              successCount += 1;
              reusedCount += 1;
              results.push({
                success: true,
                reused: true,
                email,
                memberId: existingInvitation.metadata?.memberId || null,
                invitationId: existingInvitation.id,
              });
              continue;
            }
          }

          let user = await User.findOne({ where: { email } });
          if (!user) {
            const password = crypto.randomBytes(16).toString('hex');
            user = await User.create({
              email,
              password,
              first_name: row.firstName || row.first_name || '',
              last_name: row.lastName || row.last_name || '',
              verification_token: generateInviteToken(),
            });
          }

          const department = await findByIdOrName(Department, req.organizationId, row.departmentId || row.department);
          const team = await findByIdOrName(Team, req.organizationId, row.teamId || row.team);
          const position = await findByIdOrName(Position, req.organizationId, row.positionId || row.position);
          const orgRole = await findByIdOrName(OrgRole, req.organizationId, row.roleId || row.role);

          const [member, created] = await OrganizationMember.findOrCreate({
            where: {
              organization_id: req.organizationId,
              user_id: user.id,
            },
            defaults: {
              organization_id: req.organizationId,
              user_id: user.id,
              department_id: department?.id || null,
              team_id: team?.id || null,
              position_id: position?.id || null,
              org_role_id: orgRole?.id || null,
              status: 'pending_invite',
              invited_by: req.user.id,
              invited_at: new Date(),
              metadata: {},
            },
          });

          if (!created) {
            await member.update({
              department_id: department?.id || member.department_id,
              team_id: team?.id || member.team_id,
              position_id: position?.id || member.position_id,
              org_role_id: orgRole?.id || member.org_role_id,
              status: 'pending_invite',
              invited_by: req.user.id,
              invited_at: new Date(),
            });
          }

          if (member.team_id) {
            await TeamMember.findOrCreate({
              where: {
                organization_id: req.organizationId,
                team_id: member.team_id,
                organization_member_id: member.id,
              },
              defaults: {
                organization_id: req.organizationId,
                team_id: member.team_id,
                organization_member_id: member.id,
              },
            });
          }

          const invitation = await Invitation.create({
            organization_id: req.organizationId,
            email,
            status: 'pending',
            invite_token: generateInviteToken(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            invited_by: req.user.id,
            metadata: {
              idempotencyKey: idempotencyKey || null,
              memberId: member.id,
              departmentId: member.department_id,
              teamId: member.team_id,
              positionId: member.position_id,
              roleId: member.org_role_id,
            },
          });

          await logOrgAudit({
            organizationId: req.organizationId,
            actorUserId: req.user.id,
            entityType: 'invitation',
            entityId: invitation.id,
            departmentId: member.department_id,
            action: 'created',
            message: `Invitation created for ${email}`,
            newValues: invitation.toJSON(),
          });

          successCount += 1;
          results.push({
            success: true,
            email,
            memberId: member.id,
            invitationId: invitation.id,
          });
        } catch (rowError) {
          failedCount += 1;
          results.push({
            success: false,
            email,
            error: rowError.message,
          });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          results,
          totalRequested: rows.length,
          totalProcessed: deduplicatedRows.length,
          duplicateEmailCount,
          successCount,
          failedCount,
          reusedCount,
          idempotencyKey: idempotencyKey || null,
        },
        message: 'Bulk invitation processing complete',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to process invitations',
        error: error.message,
      });
    }
  },

  async changeTeam(req, res) {
    try {
      const member = await OrganizationMember.findOne({
        where: { id: req.params.memberId, organization_id: req.organizationId },
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const team = await findByIdOrName(Team, req.organizationId, req.body.teamId || req.body.team);
      if (!team) {
        return res.status(404).json({ success: false, message: 'Team not found' });
      }

      const previous = member.toJSON();
      await member.update({
        team_id: team.id,
        department_id: team.department_id,
      });

      await TeamMember.destroy({
        where: {
          organization_id: req.organizationId,
          organization_member_id: member.id,
          team_id: { [Op.ne]: team.id },
        },
      });

      await TeamMember.findOrCreate({
        where: {
          organization_id: req.organizationId,
          team_id: team.id,
          organization_member_id: member.id,
        },
        defaults: {
          organization_id: req.organizationId,
          team_id: team.id,
          organization_member_id: member.id,
        },
      });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'member',
        entityId: member.id,
        departmentId: member.department_id,
        action: 'changed_team',
        message: `Member ${member.id} moved to team ${team.name}`,
        previousValues: previous,
        newValues: member.toJSON(),
      });

      res.json({
        success: true,
        data: member,
        message: `Team changed to ${team.name}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to change team',
        error: error.message,
      });
    }
  },

  async changePosition(req, res) {
    try {
      const member = await OrganizationMember.findOne({
        where: { id: req.params.memberId, organization_id: req.organizationId },
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const position = await findByIdOrName(Position, req.organizationId, req.body.positionId || req.body.position);
      if (!position) {
        return res.status(404).json({ success: false, message: 'Position not found' });
      }

      const previous = member.toJSON();
      await member.update({ position_id: position.id });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'member',
        entityId: member.id,
        departmentId: member.department_id,
        action: 'changed_position',
        message: `Member ${member.id} position changed to ${position.name}`,
        previousValues: previous,
        newValues: member.toJSON(),
      });

      res.json({
        success: true,
        data: member,
        message: `Position changed to ${position.name}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to change position',
        error: error.message,
      });
    }
  },

  async changeRole(req, res) {
    try {
      const member = await OrganizationMember.findOne({
        where: { id: req.params.memberId, organization_id: req.organizationId },
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const orgRole = await findByIdOrName(OrgRole, req.organizationId, req.body.roleId || req.body.role);
      if (!orgRole) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      const previous = member.toJSON();
      await member.update({ org_role_id: orgRole.id });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'member',
        entityId: member.id,
        departmentId: member.department_id,
        action: 'changed_role',
        message: `Member ${member.id} role changed to ${orgRole.name}`,
        previousValues: previous,
        newValues: member.toJSON(),
      });

      res.json({
        success: true,
        data: member,
        message: `Role changed to ${orgRole.name}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to change role',
        error: error.message,
      });
    }
  },

  async updateAssignment(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const payload = req.body || {};
      const hasAssignmentKeys =
        Object.prototype.hasOwnProperty.call(payload, 'teamId') ||
        Object.prototype.hasOwnProperty.call(payload, 'team') ||
        Object.prototype.hasOwnProperty.call(payload, 'positionId') ||
        Object.prototype.hasOwnProperty.call(payload, 'position') ||
        Object.prototype.hasOwnProperty.call(payload, 'roleId') ||
        Object.prototype.hasOwnProperty.call(payload, 'role') ||
        Object.prototype.hasOwnProperty.call(payload, 'departmentId') ||
        Object.prototype.hasOwnProperty.call(payload, 'department');

      if (!hasAssignmentKeys) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'At least one assignment field is required',
        });
      }

      const member = await OrganizationMember.findOne({
        where: { id: req.params.memberId, organization_id: req.organizationId },
        transaction,
      });
      if (!member) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const previous = member.toJSON();
      const updates = {};
      let teamTouched = false;
      let teamDepartmentId = null;

      const hasTeamInput =
        Object.prototype.hasOwnProperty.call(payload, 'teamId') ||
        Object.prototype.hasOwnProperty.call(payload, 'team');
      if (hasTeamInput) {
        teamTouched = true;
        const requestedTeam = payload.teamId !== undefined ? payload.teamId : payload.team;
        if (requestedTeam === null || requestedTeam === '') {
          updates.team_id = null;
        } else {
          const team = await findByIdOrName(Team, req.organizationId, requestedTeam);
          if (!team) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Team not found' });
          }
          updates.team_id = team.id;
          updates.department_id = team.department_id;
          teamDepartmentId = team.department_id;
        }
      }

      const hasDepartmentInput =
        Object.prototype.hasOwnProperty.call(payload, 'departmentId') ||
        Object.prototype.hasOwnProperty.call(payload, 'department');
      if (hasDepartmentInput) {
        const requestedDepartment =
          payload.departmentId !== undefined ? payload.departmentId : payload.department;
        if (requestedDepartment === null || requestedDepartment === '') {
          updates.department_id = null;
        } else {
          const department = await findByIdOrName(Department, req.organizationId, requestedDepartment);
          if (!department) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Department not found' });
          }

          if (teamDepartmentId && teamDepartmentId !== department.id) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Selected team does not belong to the selected department',
            });
          }
          updates.department_id = department.id;
        }

        if (!teamTouched && member.team_id) {
          if (updates.department_id === null) {
            updates.team_id = null;
            teamTouched = true;
          } else {
            const currentTeam = await Team.findOne({
              where: {
                id: member.team_id,
                organization_id: req.organizationId,
              },
              transaction,
            });

            if (currentTeam && currentTeam.department_id !== updates.department_id) {
              updates.team_id = null;
              teamTouched = true;
            }
          }
        }
      }

      const hasPositionInput =
        Object.prototype.hasOwnProperty.call(payload, 'positionId') ||
        Object.prototype.hasOwnProperty.call(payload, 'position');
      if (hasPositionInput) {
        const requestedPosition = payload.positionId !== undefined ? payload.positionId : payload.position;
        if (requestedPosition === null || requestedPosition === '') {
          updates.position_id = null;
        } else {
          const position = await findByIdOrName(Position, req.organizationId, requestedPosition);
          if (!position) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Position not found' });
          }
          updates.position_id = position.id;
        }
      }

      const hasRoleInput =
        Object.prototype.hasOwnProperty.call(payload, 'roleId') ||
        Object.prototype.hasOwnProperty.call(payload, 'role');
      if (hasRoleInput) {
        const requestedRole = payload.roleId !== undefined ? payload.roleId : payload.role;
        if (requestedRole === null || requestedRole === '') {
          updates.org_role_id = null;
        } else {
          const orgRole = await findByIdOrName(OrgRole, req.organizationId, requestedRole);
          if (!orgRole) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Role not found' });
          }
          updates.org_role_id = orgRole.id;
        }
      }

      if (!Object.keys(updates).length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No assignment updates were provided',
        });
      }

      await member.update(updates, { transaction });

      if (teamTouched) {
        await TeamMember.destroy({
          where: {
            organization_id: req.organizationId,
            organization_member_id: member.id,
          },
          transaction,
        });
        if (member.team_id) {
          await TeamMember.create(
            {
              organization_id: req.organizationId,
              team_id: member.team_id,
              organization_member_id: member.id,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'member',
        entityId: member.id,
        departmentId: member.department_id,
        action: 'assignment_updated',
        message: `Member ${member.id} assignment updated`,
        previousValues: previous,
        newValues: member.toJSON(),
      });

      return res.json({
        success: true,
        data: member,
        message: 'Member assignment updated successfully',
      });
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to update member assignment',
        error: error.message,
      });
    }
  },

  async moveDepartment(req, res) {
    try {
      const member = await OrganizationMember.findOne({
        where: { id: req.params.memberId, organization_id: req.organizationId },
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const department = await findByIdOrName(
        Department,
        req.organizationId,
        req.body.departmentId || req.body.department
      );
      if (!department) {
        return res.status(404).json({ success: false, message: 'Department not found' });
      }

      const previous = member.toJSON();
      await member.update({
        department_id: department.id,
        team_id: null,
      });

      await TeamMember.destroy({
        where: {
          organization_id: req.organizationId,
          organization_member_id: member.id,
        },
      });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'member',
        entityId: member.id,
        departmentId: department.id,
        action: 'moved_department',
        message: `Member ${member.id} moved to department ${department.name}`,
        previousValues: previous,
        newValues: member.toJSON(),
      });

      res.json({
        success: true,
        data: member,
        message: `Moved to ${department.name}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to move member to department',
        error: error.message,
      });
    }
  },

  async deactivateMember(req, res) {
    try {
      const member = await OrganizationMember.findOne({
        where: { id: req.params.memberId, organization_id: req.organizationId },
        include: [{ model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name', 'display_name'] }],
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const previous = member.toJSON();
      await member.update({
        status: 'deactivated',
        deactivated_at: new Date(),
      });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'member',
        entityId: member.id,
        departmentId: member.department_id,
        action: 'deactivated',
        message: `${getDisplayName(member.user)} deactivated`,
        previousValues: previous,
        newValues: member.toJSON(),
      });

      res.json({
        success: true,
        data: member,
        message: `${getDisplayName(member.user)} deactivated`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate member',
        error: error.message,
      });
    }
  },
};

module.exports = memberController;
