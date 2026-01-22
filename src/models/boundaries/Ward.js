// File: src/models/boundaries/Ward.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ward = sequelize.define('Ward', {
    ward_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lower_tier_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'lower_tier',
        key: 'lower_tier_id',
      },
    },
    single_tier_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'single_tier',
        key: 'single_tier_id',
      },
    },
    admin_id: {
      type: DataTypes.STRING(50),
    },
    ward_number: {
      type: DataTypes.INTEGER,
    },
    ward_name: {
      type: DataTypes.STRING(254),
      allowNull: false,
    },
    admin_type: {
      type: DataTypes.STRING(254),
      defaultValue: 'Ward',
    },
    parent_name: {
      type: DataTypes.STRING(254),
    },
    alias: {
      type: DataTypes.STRING(254),
    },
    geom: {
      type: DataTypes.GEOMETRY('MULTIPOLYGON', 4326),
      allowNull: false,
    },
    bbox: {
      type: DataTypes.STRING,
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  }, {
    tableName: 'wards',
    schema: 'boundaries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Ward;
};
