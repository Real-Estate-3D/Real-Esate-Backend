const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Approval = sequelize.define(
    'Approval',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
      },
      project: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      applicant: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
      },
      location: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'pending_review',
        validate: {
          isIn: [['pending_review', 'assigned', 'approved', 'rejected', 'revision_requested']],
        },
      },
      submitted_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Snapshot of the assigned reviewer: { id, name, role, email }
      assigned_reviewer: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      zoning_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      legislation_details: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      site_plan: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      legislative_compliance: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      required_studies: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      workflow_steps: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      documents: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'approvals',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['status'] },
        { fields: ['applicant'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return Approval;
};
