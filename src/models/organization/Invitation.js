const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invitation = sequelize.define(
    'Invitation',
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
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
      },
      invite_token: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      expires_at: DataTypes.DATE,
      invited_by: DataTypes.INTEGER,
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: 'invitation',
      schema: 'organization',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Invitation;
};

