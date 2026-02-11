const { Organization, OrganizationMember, OrgRole } = require("../models");
const {
  mergePermissionMatrices,
  hasToolPermission,
} = require("../utils/permissionMatrix");
const { isSystemManagerRole } = require("./toolPermissions");

const isManagerRole = (user) => isSystemManagerRole(user);

const resolveOrganizationContext = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId || req.headers['x-organization-id'];
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'organizationId is required',
      });
    }

    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    const membership = await OrganizationMember.findOne({
      where: {
        organization_id: organizationId,
        user_id: req.user.id,
      },
      include: [{ model: OrgRole, as: "orgRole", attributes: ["id", "name", "permissions"] }],
    });

    if (!membership && !isManagerRole(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'User does not have access to this organization',
      });
    }

    req.organization = organization;
    req.organizationId = organizationId;
    req.organizationMembership = membership || null;
    req.orgRole = membership?.orgRole || null;
    const systemPermissionPayloads = (req.user?.roles || [])
      .map((role) => role?.permissions)
      .filter((value) => value !== undefined && value !== null);
    req.permissionMatrix = mergePermissionMatrices(
      ...systemPermissionPayloads,
      membership?.orgRole?.permissions || []
    );
    next();
  } catch (error) {
    next(error);
  }
};

const requireOrganizationMember = (req, res, next) => {
  if (req.organizationMembership || isManagerRole(req.user)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Organization membership is required',
  });
};

const authorizeOrganizationManager = (req, res, next) => {
  if (
    isManagerRole(req.user) ||
    hasToolPermission(req.permissionMatrix, "organization_management", "edit")
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Organization management edit permission is required for this action',
  });
};

module.exports = {
  resolveOrganizationContext,
  requireOrganizationMember,
  authorizeOrganizationManager,
  isManagerRole,
};
