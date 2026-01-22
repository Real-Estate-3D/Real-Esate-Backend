// File: src/models/landuse/Zoning.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Zoning = sequelize.define('Zoning', {
    zoning_id: {
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
    zone_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    zone_name: {
      type: DataTypes.STRING(254),
      allowNull: false,
    },
    bylaw_number: {
      type: DataTypes.STRING(50),
    },
    permitted_uses: {
      type: DataTypes.TEXT,
    },
    zone_standards: {
      type: DataTypes.TEXT,
    },
    ordinance_url: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.STRING(50),
    },
    notes: {
      type: DataTypes.TEXT,
    },
    area_sq_m: {
      type: DataTypes.DECIMAL(15, 4),
    },
    geom: {
      type: DataTypes.GEOMETRY('MULTIPOLYGON', 4326),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  }, {
    tableName: 'zoning',
    schema: 'landuse',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Zoning;
};
