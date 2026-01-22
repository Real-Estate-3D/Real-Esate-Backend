// File: src/models/boundaries/LowerTier.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LowerTier = sequelize.define('LowerTier', {
    lower_tier_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    upper_tier_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'upper_tier',
        key: 'upper_tier_id',
      },
    },
    admin_id: {
      type: DataTypes.STRING(50),
      unique: true,
    },
    admin_name: {
      type: DataTypes.STRING(254),
      allowNull: false,
    },
    admin_type: {
      type: DataTypes.STRING(254),
    },
    tier_type_id: {
      type: DataTypes.INTEGER,
      references: {
        model: { tableName: 'boundary_tier_types', schema: 'reference' },
        key: 'tier_type_id',
      },
    },
    parent_name: {
      type: DataTypes.STRING(254),
    },
    alias: {
      type: DataTypes.TEXT,
    },
    population: {
      type: DataTypes.INTEGER,
    },
    area_sq_km: {
      type: DataTypes.DECIMAL(15, 4),
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
    tableName: 'lower_tier',
    schema: 'boundaries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return LowerTier;
};
