// File: src/models/legislation/LegislationVersion.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LegislationVersion = sequelize.define('LegislationVersion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    legislation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'legislations',
        key: 'id',
      },
    },
    version_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
    },
    changes_summary: {
      type: DataTypes.TEXT,
    },
    snapshot: {
      type: DataTypes.JSONB,
      comment: 'Full snapshot of legislation state at this version',
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
      defaultValue: 'draft',
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    approved_by: {
      type: DataTypes.INTEGER,
    },
    approved_at: {
      type: DataTypes.DATE,
    },
  }, {
    tableName: 'legislation_versions',
    schema: 'public',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['legislation_id', 'version_number'],
      },
    ],
  });

  return LegislationVersion;
};
