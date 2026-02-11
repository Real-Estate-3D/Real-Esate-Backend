const { OrgAuditLog } = require('../models');

const logOrgAudit = async ({
  organizationId,
  actorUserId,
  entityType,
  entityId,
  departmentId = null,
  action,
  message,
  previousValues = {},
  newValues = {},
  metadata = {},
}) => {
  if (!organizationId || !entityType || !entityId || !action || !message) {
    return null;
  }

  return OrgAuditLog.create({
    organization_id: organizationId,
    actor_user_id: actorUserId || null,
    entity_type: entityType,
    entity_id: String(entityId),
    department_id: departmentId || null,
    action,
    message,
    previous_values: previousValues || {},
    new_values: newValues || {},
    metadata: metadata || {},
  });
};

module.exports = {
  logOrgAudit,
};

