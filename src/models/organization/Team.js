const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Team = sequelize.define(
    'Team',
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
      department_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      lead_member_id: DataTypes.UUID,
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'active',
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: 'team',
      schema: 'organization',
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return Team;
};

