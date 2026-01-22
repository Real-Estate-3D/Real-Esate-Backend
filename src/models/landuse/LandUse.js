// File: src/models/landuse/LandUse.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LandUse = sequelize.define('LandUse', {
    land_use_id: {
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
    designation_code: {
      type: DataTypes.STRING(50),
    },
    designation_name: {
      type: DataTypes.STRING(254),
      allowNull: false,
    },
    amendment_number: {
      type: DataTypes.STRING(100),
    },
    description: {
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
    tableName: 'land_use',
    schema: 'landuse',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return LandUse;
};
