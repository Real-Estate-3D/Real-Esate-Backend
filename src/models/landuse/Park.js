// File: src/models/landuse/Park.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Park = sequelize.define('Park', {
    park_id: {
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
    object_id: {
      type: DataTypes.STRING(50),
    },
    park_name: {
      type: DataTypes.STRING(254),
      allowNull: false,
    },
    park_type: {
      type: DataTypes.STRING(100),
    },
    status: {
      type: DataTypes.STRING(50),
    },
    address: {
      type: DataTypes.STRING(254),
    },
    area_ha: {
      type: DataTypes.DECIMAL(15, 6),
    },
    facility_id: {
      type: DataTypes.STRING(100),
    },
    asset_id: {
      type: DataTypes.STRING(100),
    },
    amenities: {
      type: DataTypes.TEXT,
    },
    playgrounds: {
      type: DataTypes.INTEGER,
    },
    legacy_id: {
      type: DataTypes.STRING(50),
    },
    installation_date: {
      type: DataTypes.DATEONLY,
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
    tableName: 'parks',
    schema: 'landuse',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Park;
};
