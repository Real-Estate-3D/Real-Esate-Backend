// File: src/models/reference/FeatureType.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FeatureType = sequelize.define('FeatureType', {
    feature_type_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    feature_category: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    feature_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    geometry_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['POINT', 'LINESTRING', 'POLYGON', 'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON']],
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'feature_types',
    schema: 'reference',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return FeatureType;
};
