const { Op } = require("sequelize");
const { OrganizationMember, OrgRole } = require("../models");
const {
  normalizePermissionMatrix,
  mergePermissionMatrices,
  hasToolPermission,
} = require("../utils/permissionMatrix");

const isSystemManagerRole = (user) => {
  const roleNames = (user?.roles || []).map((role) =>
    String(role?.name || "").toLowerCase()
  );
  return roleNames.includes("admin") || roleNames.includes("city_official");
};

const deriveSystemRoleMatrix = (user) => {
  if (isSystemManagerRole(user)) {
    return normalizePermissionMatrix("*");
  }

  const permissionPayloads = (user?.roles || [])
    .map((role) => role?.permissions)
    .filter((value) => value !== undefined && value !== null);

  if (!permissionPayloads.length) {
    return normalizePermissionMatrix([]);
  }

  return mergePermissionMatrices(...permissionPayloads);
};

const resolveOrganizationMembershipForRequest = async (req) => {
  if (req.organizationMembership && req.organizationId) {
    return req.organizationMembership;
  }

  const organizationId =
    req.params.organizationId ||
    req.headers["x-organization-id"] ||
    req.query.organizationId ||
    req.body?.organizationId ||
    null;

  let membership = null;
  if (organizationId) {
    membership = await OrganizationMember.findOne({
      where: {
        organization_id: organizationId,
        user_id: req.user.id,
        status: { [Op.ne]: "inactive" },
      },
      include: [{ model: OrgRole, as: "orgRole", attributes: ["id", "name", "permissions"] }],
    });
  }

  if (!membership && !organizationId) {
    membership = await OrganizationMember.findOne({
      where: {
        user_id: req.user.id,
        status: { [Op.ne]: "inactive" },
      },
      include: [{ model: OrgRole, as: "orgRole", attributes: ["id", "name", "permissions"] }],
      order: [
        ["is_org_admin", "DESC"],
        ["created_at", "ASC"],
      ],
    });
  }

  if (membership) {
    req.organizationMembership = membership;
    req.organizationId = membership.organization_id;
    req.orgRole = membership.orgRole || null;
  } else if (organizationId) {
    req.organizationId = organizationId;
  }

  return membership;
};

const resolvePermissionMatrix = async (req) => {
  const systemMatrix = deriveSystemRoleMatrix(req.user);

  const membership = await resolveOrganizationMembershipForRequest(req);
  const rolePermissions = membership?.orgRole?.permissions || [];
  const organizationMatrix = normalizePermissionMatrix(rolePermissions);

  const matrix = mergePermissionMatrices(systemMatrix, organizationMatrix);
  req.permissionMatrix = matrix;
  return matrix;
};

const requireToolPermission = (toolKey, action = "view") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const permissionMatrix = await resolvePermissionMatrix(req);
      const allowed = hasToolPermission(permissionMatrix, toolKey, action);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          required: { tool: toolKey, action },
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = {
  requireToolPermission,
  resolvePermissionMatrix,
  resolveOrganizationMembershipForRequest,
  isSystemManagerRole,
};
