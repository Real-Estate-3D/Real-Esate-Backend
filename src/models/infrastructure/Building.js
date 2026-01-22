// File: src/models/infrastructure/Building.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Building = sequelize.define('Building', {
    building_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lower_tier_id: {
      type: DataTypes.INTEGER,
    },
    single_tier_id: {
      type: DataTypes.INTEGER,
    },
    ward_id: {
      type: DataTypes.INTEGER,
    },
    object_id: {
      type: DataTypes.STRING(50),
    },
    building_type: {
      type: DataTypes.STRING(254),
    },
    facility_id: {
      type: DataTypes.STRING(100),
    },
    property_number: {
      type: DataTypes.STRING(50),
    },
    property_code: {
      type: DataTypes.STRING(50),
    },
    property_type: {
      type: DataTypes.STRING(254),
    },
    building_height: {
      type: DataTypes.DECIMAL(10, 2),
    },
    stories: {
      type: DataTypes.INTEGER,
    },
    area_sq_m: {
      type: DataTypes.DECIMAL(15, 4),
    },
    perimeter_m: {
      type: DataTypes.DECIMAL(15, 4),
    },
    construction_date: {
      type: DataTypes.DATEONLY,
    },
    last_modified: {
      type: DataTypes.DATE,
    },
    last_user: {
      type: DataTypes.STRING(100),
    },
    notes: {
      type: DataTypes.TEXT,
    },
    geom: {
      type: DataTypes.GEOMETRY('MULTIPOLYGON', 4326),
      allowNull: false,
    },
    centroid: {
      type: DataTypes.GEOMETRY('POINT', 4326),
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  }, {
    tableName: 'buildings',
    schema: 'infrastructure',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Building;
};
