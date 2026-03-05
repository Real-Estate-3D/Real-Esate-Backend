const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define(
    'Project',
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
      applicant: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
      },
      project_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          isIn: [['residential', 'commercial', 'mixed_use', 'industrial', 'institutional']],
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'pending_review',
        validate: {
          isIn: [['pending_review', 'in_progress', 'approved', 'rejected', 'revision_requested']],
        },
      },
      submitted_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      parcel_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      parcel_address: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      proposed_zoning: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      use_site_specific_zoning: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      zoning_info: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      compliance: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      documents: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      model_3d: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      legislative_change_request: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
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
      tableName: 'projects',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['status'] },
        { fields: ['project_type'] },
        { fields: ['applicant'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return Project;
};
