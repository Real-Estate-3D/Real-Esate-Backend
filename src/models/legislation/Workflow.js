// Workflow Model - Workflow templates for legislation processes
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Workflow = sequelize.define('Workflow', {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('project-specific', 'municipal', 'template'),
      allowNull: false,
      defaultValue: 'project-specific'
    },
    is_template: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    project: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    applies_to: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'draft', 'completed'),
      defaultValue: 'active',
      allowNull: false
    },
    jurisdiction: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    jurisdiction_id: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    jurisdiction_tier_type: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'workflows',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['jurisdiction'] },
      { fields: ['jurisdiction_id'] },
      { fields: ['jurisdiction_tier_type'] },
      { fields: ['type'] },
      { fields: ['is_template'] }
    ]
  });

  return Workflow;
};
