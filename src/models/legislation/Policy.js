// Policy Model - Policy records
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Policy = sequelize.define('Policy', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Category: Environmental, Zoning, Safety, etc.'
    },
    rules: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Rules description text'
    },
    full_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Full policy text content'
    },
    // Policy parameters stored as JSONB
    parameters: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of policy parameters: [{label, value, unit}]'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'draft', 'pending'),
      defaultValue: 'active',
      allowNull: false
    },
    effective_from: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    effective_to: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    jurisdiction: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    municipality: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    legislation_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'policies',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['category'] },
      { fields: ['status'] },
      { fields: ['jurisdiction'] },
      { fields: ['legislation_id'] }
    ]
  });

  return Policy;
};
