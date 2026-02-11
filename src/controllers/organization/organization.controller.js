const { Organization, OrganizationMember, User, OrgRole, Position } = require('../../models');
const { logOrgAudit } = require('../../utils/orgAudit');
const { normalizePermissionMatrix } = require('../../utils/permissionMatrix');

const ensureDefaultOrgSettings = async (organizationId) => {
  const defaultRoles = [
    {
      name: 'Admin',
      permissions: normalizePermissionMatrix('*'),
      is_system: true,
    },
    {
      name: 'City Official',
      permissions: normalizePermissionMatrix({
        mapping_zoning: { view: true, edit: true },
        legislation: { view: true, edit: true },
        organization_management: { view: true, edit: true },
      }),
      is_system: true,
    },
    {
      name: 'Planner',
      permissions: normalizePermissionMatrix({
        mapping_zoning: { view: true, edit: true },
        legislation: { view: true, edit: true },
        organization_management: { view: true, edit: false },
      }),
      is_system: true,
    },
    {
      name: 'Reviewer',
      permissions: normalizePermissionMatrix({
        mapping_zoning: { view: true, edit: false },
        legislation: { view: true, edit: false },
        organization_management: { view: true, edit: false },
      }),
      is_system: true,
    },
  ];

  for (const role of defaultRoles) {
    await OrgRole.findOrCreate({
      where: { organization_id: organizationId, name: role.name },
      defaults: { organization_id: organizationId, ...role, metadata: {} },
    });
  }

  const defaultPositions = ['Planner', 'Designer', 'Developer', 'Reviewer'];
  for (const name of defaultPositions) {
    await Position.findOrCreate({
      where: { organization_id: organizationId, name },
      defaults: {
        organization_id: organizationId,
        name,
        is_active: true,
        metadata: {},
      },
    });
  }
};

const organizationController = {
  async getOrganizations(req, res) {
    try {
      const memberships = await OrganizationMember.findAll({
        where: { user_id: req.user.id },
        include: [{ model: Organization, as: 'organization' }],
        order: [['created_at', 'DESC']],
      });

      const data = memberships
        .filter((membership) => membership.organization)
        .map((membership) => ({
          id: membership.organization.id,
          name: membership.organization.name,
          setupStatus: membership.organization.setup_status,
          memberStatus: membership.status,
          isOrgAdmin: membership.is_org_admin,
          roleId: membership.org_role_id,
          createdAt: membership.organization.created_at,
          updatedAt: membership.organization.updated_at,
        }));

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organizations',
        error: error.message,
      });
    }
  },

  async createOrganization(req, res) {
    try {
      const payload = req.body || {};
      const organization = await Organization.create({
        name: payload.name || 'Untitled Organization',
        street_address_1: payload.streetAddress1 || '',
        street_address_2: payload.streetAddress2 || '',
        city: payload.city || '',
        state_region: payload.stateRegion || '',
        postal_zip: payload.postalZip || '',
        country: payload.country || '',
        website: payload.website || '',
        primary_contact_email: payload.primaryContactEmail || req.user.email || '',
        logo_url: payload.logoUrl || null,
        setup_status: 'not_started',
        metadata: payload.metadata || {},
        created_by: req.user.id,
        updated_by: req.user.id,
      });

      await OrganizationMember.create({
        organization_id: organization.id,
        user_id: req.user.id,
        status: 'active',
        is_org_admin: true,
        invited_by: req.user.id,
        invited_at: new Date(),
        metadata: {},
      });

      await ensureDefaultOrgSettings(organization.id);

      await logOrgAudit({
        organizationId: organization.id,
        actorUserId: req.user.id,
        entityType: 'organization',
        entityId: organization.id,
        action: 'created',
        message: `Organization ${organization.name} created`,
        newValues: organization.toJSON(),
      });

      res.status(201).json({
        success: true,
        data: organization,
        message: 'Organization created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create organization',
        error: error.message,
      });
    }
  },

  async getProfile(req, res) {
    try {
      res.json({
        success: true,
        data: req.organization,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organization profile',
        error: error.message,
      });
    }
  },

  async updateProfile(req, res) {
    try {
      const previous = req.organization.toJSON();
      const payload = req.body || {};

      const updates = {
        name: payload.name ?? req.organization.name,
        street_address_1: payload.streetAddress1 ?? req.organization.street_address_1,
        street_address_2: payload.streetAddress2 ?? req.organization.street_address_2,
        city: payload.city ?? req.organization.city,
        state_region: payload.stateRegion ?? req.organization.state_region,
        postal_zip: payload.postalZip ?? req.organization.postal_zip,
        country: payload.country ?? req.organization.country,
        website: payload.website ?? req.organization.website,
        primary_contact_email: payload.primaryContactEmail ?? req.organization.primary_contact_email,
        updated_by: req.user.id,
      };

      if (req.file) {
        updates.logo_url = `/uploads/${req.file.filename}`;
      } else if (payload.logoUrl) {
        updates.logo_url = payload.logoUrl;
      }

      await req.organization.update(updates);

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'organization',
        entityId: req.organizationId,
        action: 'updated',
        message: `Organization ${req.organization.name} profile updated`,
        previousValues: previous,
        newValues: req.organization.toJSON(),
      });

      res.json({
        success: true,
        data: req.organization,
        message: 'Organization profile updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update organization profile',
        error: error.message,
      });
    }
  },

  async getSetupStatus(req, res) {
    try {
      res.json({
        success: true,
        data: {
          organizationId: req.organization.id,
          setupStatus: req.organization.setup_status,
          setupCompletedAt: req.organization.setup_completed_at,
          setupSkippedAt: req.organization.setup_skipped_at,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch setup status',
        error: error.message,
      });
    }
  },

  async updateSetupStatus(req, res) {
    try {
      const previous = req.organization.toJSON();
      const { setupStatus } = req.body;
      const normalized = ['not_started', 'in_progress', 'completed', 'skipped'].includes(setupStatus)
        ? setupStatus
        : 'not_started';

      const updates = {
        setup_status: normalized,
        updated_by: req.user.id,
      };

      if (normalized === 'completed') {
        updates.setup_completed_at = new Date();
      }
      if (normalized === 'skipped') {
        updates.setup_skipped_at = new Date();
      }

      await req.organization.update(updates);

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'organization',
        entityId: req.organizationId,
        action: 'setup_status_changed',
        message: `Organization setup status changed to ${normalized}`,
        previousValues: previous,
        newValues: req.organization.toJSON(),
      });

      res.json({
        success: true,
        data: {
          organizationId: req.organization.id,
          setupStatus: req.organization.setup_status,
          setupCompletedAt: req.organization.setup_completed_at,
          setupSkippedAt: req.organization.setup_skipped_at,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update setup status',
        error: error.message,
      });
    }
  },
};

module.exports = organizationController;
