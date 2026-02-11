const TOOL_KEYS = [
  "mapping_zoning",
  "legislation",
  "organization_management",
  "data_management",
  "accounting",
  "approvals",
];

const ACTIONS = ["view", "edit"];

const LEGACY_PERMISSION_MAP = {
  "mapping.read": { tool: "mapping_zoning", action: "view" },
  "mapping.edit": { tool: "mapping_zoning", action: "edit" },
  "legislation.read": { tool: "legislation", action: "view" },
  "legislation.create": { tool: "legislation", action: "edit" },
  "legislation.update": { tool: "legislation", action: "edit" },
  "legislation.delete": { tool: "legislation", action: "edit" },
  "legislation.approve": { tool: "legislation", action: "edit" },
  "workflow.read": { tool: "legislation", action: "view" },
  "workflow.create": { tool: "legislation", action: "edit" },
  "workflow.update": { tool: "legislation", action: "edit" },
  "workflow.delete": { tool: "legislation", action: "edit" },
  "org.manage": { tool: "organization_management", action: "edit" },
  "members.read": { tool: "organization_management", action: "view" },
  "members.manage": { tool: "organization_management", action: "edit" },
  "settings.manage": { tool: "organization_management", action: "edit" },
  "approvals.read": { tool: "approvals", action: "view" },
  "approvals.edit": { tool: "approvals", action: "edit" },
  "accounting.read": { tool: "accounting", action: "view" },
  "accounting.edit": { tool: "accounting", action: "edit" },
  "data.read": { tool: "data_management", action: "view" },
  "data.edit": { tool: "data_management", action: "edit" },
};

const buildEmptyMatrix = () =>
  TOOL_KEYS.reduce((acc, tool) => {
    acc[tool] = { view: false, edit: false };
    return acc;
  }, {});

const enableAll = () =>
  TOOL_KEYS.reduce((acc, tool) => {
    acc[tool] = { view: true, edit: true };
    return acc;
  }, {});

const isMatrixObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

const normalizeEntry = (entry = {}) => {
  if (typeof entry === "boolean") {
    return { view: entry, edit: entry };
  }
  return {
    view: !!entry.view || !!entry.edit,
    edit: !!entry.edit,
  };
};

const normalizePermissionMatrix = (permissions) => {
  if (permissions === "*") {
    return enableAll();
  }

  if (Array.isArray(permissions)) {
    if (
      permissions.includes("*") ||
      permissions.includes("system.admin") ||
      permissions.includes("admin")
    ) {
      return enableAll();
    }

    const matrix = buildEmptyMatrix();
    permissions.forEach((permission) => {
      const mapping = LEGACY_PERMISSION_MAP[String(permission || "").trim()];
      if (!mapping) return;
      matrix[mapping.tool].view = true;
      if (mapping.action === "edit") {
        matrix[mapping.tool].edit = true;
      }
    });
    return matrix;
  }

  if (isMatrixObject(permissions)) {
    const matrix = buildEmptyMatrix();
    TOOL_KEYS.forEach((tool) => {
      matrix[tool] = normalizeEntry(permissions[tool]);
    });
    return matrix;
  }

  return buildEmptyMatrix();
};

const mergePermissionMatrices = (...matrices) => {
  const merged = buildEmptyMatrix();
  matrices.forEach((matrix) => {
    const normalized = normalizePermissionMatrix(matrix);
    TOOL_KEYS.forEach((tool) => {
      merged[tool].view = merged[tool].view || normalized[tool].view;
      merged[tool].edit = merged[tool].edit || normalized[tool].edit;
    });
  });
  return merged;
};

const hasToolPermission = (matrix, toolKey, action = "view") => {
  if (!TOOL_KEYS.includes(toolKey) || !ACTIONS.includes(action)) {
    return false;
  }
  const normalized = normalizePermissionMatrix(matrix);
  const entry = normalized[toolKey];
  if (!entry) return false;

  if (action === "view") {
    return !!entry.view || !!entry.edit;
  }
  return !!entry.edit;
};

module.exports = {
  TOOL_KEYS,
  ACTIONS,
  buildEmptyMatrix,
  normalizePermissionMatrix,
  mergePermissionMatrices,
  hasToolPermission,
};
