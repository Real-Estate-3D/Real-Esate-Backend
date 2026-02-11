const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeamMember = sequelize.define(
    'TeamMember',
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
      team_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      organization_member_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: 'team_member',
      schema: 'organization',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return TeamMember;
};

