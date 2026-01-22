// File: src/models/reference/BoundaryTierType.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BoundaryTierType = sequelize.define('BoundaryTierType', {
    tier_type_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tier_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    tier_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '1=upper/regional, 2=lower/municipal, 3=ward',
    },
    description: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'boundary_tier_types',
    schema: 'reference',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return BoundaryTierType;
};
