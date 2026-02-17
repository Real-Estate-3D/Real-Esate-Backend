const { Op } = require('sequelize');
const { OrgRole, Position, OrganizationMember } = require('../../models');
const { logOrgAudit } = require('../../utils/orgAudit');
const { normalizePermissionMatrix } = require('../../utils/permissionMatrix');

const serializeRole = (role) => {
  const json = role.toJSON();
  return {
    ...json,
    permissions: normalizePermissionMatrix(json.permissions),
  };
};

const orgSettingsController = {
  async getOrgRoles(req, res) {
    try {
      const roles = await OrgRole.findAll({
        where: { organization_id: req.organizationId },
        order: [['created_at', 'ASC']],
      });

      res.json({ success: true, data: roles.map(serializeRole) });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organization roles',
        error: error.message,
      });
    }
  },

  async createOrgRole(req, res) {
    try {
      const { name, permissions = [], isSystem = false } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Role name is required' });
      }

      const normalizedPermissions = normalizePermissionMatrix(permissions);
      const role = await OrgRole.create({
        organization_id: req.organizationId,
        name: String(name).trim(),
        permissions: normalizedPermissions,
        is_system: !!isSystem,
        is_active: true,
      });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'org_role',
        entityId: role.id,
        action: 'created',
        message: `Organization role ${role.name} created`,
        newValues: role.toJSON(),
      });

      res.status(201).json({
        success: true,
        data: serializeRole(role),
        message: 'Role created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: error.message,
      });
    }
  },

  async updateOrgRole(req, res) {
    try {
      const role = await OrgRole.findOne({
        where: { id: req.params.orgRoleId, organization_id: req.organizationId },
      });
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      const previous = role.toJSON();
      const updates = {};
      if (req.body.name !== undefined) updates.name = String(req.body.name || '').trim();
      if (req.body.permissions !== undefined) {
        updates.permissions = normalizePermissionMatrix(req.body.permissions);
      }
      if (req.body.isActive !== undefined) updates.is_active = !!req.body.isActive;

      await role.update(updates);

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'org_role',
        entityId: role.id,
        action: 'updated',
        message: `Organization role ${role.name} updated`,
        previousValues: previous,
        newValues: role.toJSON(),
      });

      res.json({
        success: true,
        data: serializeRole(role),
        message: 'Role updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: error.message,
      });
    }
  },

  async deleteOrgRole(req, res) {
    try {
      const role = await OrgRole.findOne({
        where: { id: req.params.orgRoleId, organization_id: req.organizationId },
      });
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      const previous = role.toJSON();
      await role.destroy();

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'org_role',
        entityId: role.id,
        action: 'deleted',
        message: `Organization role ${role.name} deleted`,
        previousValues: previous,
      });

      res.json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete role',
        error: error.message,
      });
    }
  },

  async updatePermissionsMatrix(req, res) {
    try {
      const updates = Array.isArray(req.body?.roles) ? req.body.roles : [];
      const output = [];
      for (const item of updates) {
        if (!item?.id) continue;
        const role = await OrgRole.findOne({
          where: { id: item.id, organization_id: req.organizationId },
        });
        if (!role) continue;

        const previous = role.toJSON();
        await role.update({
          permissions: normalizePermissionMatrix(item.permissions),
        });

        await logOrgAudit({
          organizationId: req.organizationId,
          actorUserId: req.user.id,
          entityType: 'org_role',
          entityId: role.id,
          action: 'permissions_matrix_updated',
          message: `Permissions matrix updated for role ${role.name}`,
          previousValues: previous,
          newValues: role.toJSON(),
        });

        output.push(serializeRole(role));
      }

      res.json({
        success: true,
        data: output,
        message: 'Permissions matrix updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update permissions matrix',
        error: error.message,
      });
    }
  },

  async getMyPermissions(req, res) {
    try {
      const orgRole = req.organizationMembership?.orgRole || null;

      res.json({
        success: true,
        data: {
          organizationId: req.organizationId,
          role: orgRole
            ? {
                id: orgRole.id,
                name: orgRole.name,
              }
            : null,
          permissions: normalizePermissionMatrix(orgRole?.permissions || req.permissionMatrix || []),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch current user permissions',
        error: error.message,
      });
    }
  },

  async getPositions(req, res) {
    try {
      const positions = await Position.findAll({
        where: { organization_id: req.organizationId },
        order: [['created_at', 'ASC']],
      });

      res.json({
        success: true,
        data: positions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch positions',
        error: error.message,
      });
    }
  },

  async createPosition(req, res) {
    try {
      const { name } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Position name is required' });
      }

      const position = await Position.create({
        organization_id: req.organizationId,
        name: String(name).trim(),
        is_active: true,
      });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'position',
        entityId: position.id,
        action: 'created',
        message: `Position ${position.name} created`,
        newValues: position.toJSON(),
      });

      res.status(201).json({
        success: true,
        data: position,
        message: 'Position created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create position',
        error: error.message,
      });
    }
  },

  async updatePosition(req, res) {
    try {
      const position = await Position.findOne({
        where: { id: req.params.positionId, organization_id: req.organizationId },
      });
      if (!position) {
        return res.status(404).json({ success: false, message: 'Position not found' });
      }

      const previous = position.toJSON();
      await position.update({
        name: req.body.name !== undefined ? String(req.body.name || '').trim() : position.name,
      });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'position',
        entityId: position.id,
        action: 'updated',
        message: `Position ${position.name} updated`,
        previousValues: previous,
        newValues: position.toJSON(),
      });

      res.json({
        success: true,
        data: position,
        message: 'Position updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update position',
        error: error.message,
      });
    }
  },

  async deletePosition(req, res) {
    try {
      const position = await Position.findOne({
        where: { id: req.params.positionId, organization_id: req.organizationId },
      });
      if (!position) {
        return res.status(404).json({ success: false, message: 'Position not found' });
      }

      const assignedMemberCount = await OrganizationMember.count({
        where: {
          organization_id: req.organizationId,
          position_id: position.id,
          status: {
            [Op.ne]: 'deactivated',
          },
        },
      });

      const reassignToPositionId = String(req.query.reassignTo || req.body?.reassignToPositionId || '').trim();

      if (assignedMemberCount > 0 && !reassignToPositionId) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete ${position.name}. ${assignedMemberCount} member(s) are assigned to this position. Reassign them first.`,
          data: {
            assignedMemberCount,
          },
        });
      }

      if (assignedMemberCount > 0 && reassignToPositionId) {
        if (reassignToPositionId === position.id) {
          return res.status(400).json({
            success: false,
            message: 'Reassignment target position must be different from the deleted position',
          });
        }

        const targetPosition = await Position.findOne({
          where: {
            id: reassignToPositionId,
            organization_id: req.organizationId,
          },
        });
        if (!targetPosition) {
          return res.status(404).json({
            success: false,
            message: 'Reassignment target position not found',
          });
        }

        await OrganizationMember.update(
          { position_id: targetPosition.id },
          {
            where: {
              organization_id: req.organizationId,
              position_id: position.id,
              status: {
                [Op.ne]: 'deactivated',
              },
            },
          }
        );
      }

      const previous = position.toJSON();
      await position.destroy();

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'position',
        entityId: position.id,
        action: 'deleted',
        message: `Position ${position.name} deleted`,
        previousValues: previous,
      });

      res.json({
        success: true,
        data: {
          assignedMemberCount,
        },
        message: 'Position deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete position',
        error: error.message,
      });
    }
  },
};

module.exports = orgSettingsController;
