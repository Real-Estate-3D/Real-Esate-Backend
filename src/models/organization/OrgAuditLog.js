const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgAuditLog = sequelize.define(
    'OrgAuditLog',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      actor_user_id: DataTypes.INTEGER,
      entity_type: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      department_id: DataTypes.UUID,
      action: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      previous_values: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      new_values: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: 'org_audit_log',
      schema: 'organization',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return OrgAuditLog;
};

