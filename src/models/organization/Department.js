const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Department = sequelize.define(
    'Department',
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
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'active',
      },
      head_member_id: DataTypes.UUID,
      parent_department_id: DataTypes.UUID,
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: 'department',
      schema: 'organization',
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return Department;
};

