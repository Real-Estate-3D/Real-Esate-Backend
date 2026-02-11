const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrgRole = sequelize.define(
    'OrgRole',
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
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      is_system: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: 'org_role',
      schema: 'organization',
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return OrgRole;
};

