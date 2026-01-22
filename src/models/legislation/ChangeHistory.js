// ChangeHistory Model - Track changes to legislations and zoning laws
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChangeHistory = sequelize.define('ChangeHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Description of the change'
    },
    change_type: {
      type: DataTypes.ENUM('created', 'updated', 'deleted', 'published', 'approved', 'rejected', 'version_created'),
      allowNull: false,
      defaultValue: 'updated'
    },
    // Affected entities stored as JSONB for flexible linking
    affected_entities: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of affected entities: [{type, id, title, url}]'
    },
    // Previous values for audit trail
    previous_values: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Previous field values before change'
    },
    // New values for audit trail
    new_values: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'New field values after change'
    },
    legislation_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    zoning_law_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    policy_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who made the change'
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'User name for display purposes'
    }
  }, {
    tableName: 'change_history',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['date'] },
      { fields: ['change_type'] },
      { fields: ['legislation_id'] },
      { fields: ['zoning_law_id'] },
      { fields: ['user_id'] }
    ]
  });

  return ChangeHistory;
};
