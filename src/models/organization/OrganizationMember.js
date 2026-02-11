const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrganizationMember = sequelize.define(
    'OrganizationMember',
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
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      department_id: DataTypes.UUID,
      team_id: DataTypes.UUID,
      position_id: DataTypes.UUID,
      org_role_id: DataTypes.UUID,
      reports_to_member_id: DataTypes.UUID,
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'active',
      },
      is_org_admin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      invited_by: DataTypes.INTEGER,
      invited_at: DataTypes.DATE,
      deactivated_at: DataTypes.DATE,
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: 'organization_members',
      schema: 'organization',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return OrganizationMember;
};

