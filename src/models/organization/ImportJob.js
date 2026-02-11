const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ImportJob = sequelize.define(
    'ImportJob',
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
      entity: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      format: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'processing',
      },
      total_rows: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      success_rows: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failed_rows: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      report: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      uploaded_by: DataTypes.INTEGER,
    },
    {
      tableName: 'import_job',
      schema: 'organization',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ImportJob;
};

