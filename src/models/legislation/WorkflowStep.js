// WorkflowStep Model - Steps within a workflow
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkflowStep = sequelize.define('WorkflowStep', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    step_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    step_type: {
      type: DataTypes.ENUM('submission', 'review', 'approval', 'notification', 'inspection', 'finalization'),
      allowNull: false,
      defaultValue: 'review'
    },
    required: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    duration_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Expected duration in days'
    },
    assignee_role: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Role responsible for this step'
    },
    workflow_id: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'workflow_steps',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['workflow_id'] },
      { fields: ['step_order'] }
    ]
  });

  return WorkflowStep;
};
