// File: src/models/legislation/LegislationBranch.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LegislationBranch = sequelize.define('LegislationBranch', {
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    parent_branch_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'legislation_branches',
        key: 'id',
      },
    },
    base_version_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'legislation_versions',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'merged', 'closed', 'archived'),
      defaultValue: 'active',
    },
    is_main: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    merged_at: {
      type: DataTypes.DATE,
    },
    merged_by: {
      type: DataTypes.INTEGER,
    },
    merged_into_branch_id: {
      type: DataTypes.INTEGER,
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'legislation_branches',
    schema: 'public',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['legislation_id', 'name'],
      },
    ],
  });

  return LegislationBranch;
};
