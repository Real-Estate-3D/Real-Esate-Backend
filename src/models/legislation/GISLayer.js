// File: src/models/legislation/GISLayer.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GISLayer = sequelize.define('GISLayer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    layer_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'GeoServer layer name',
    },
    layer_type: {
      type: DataTypes.ENUM('WMS', 'WFS', 'WMTS', 'TileLayer', 'GeoJSON'),
      defaultValue: 'WMS',
    },
    category: {
      type: DataTypes.STRING(100),
    },
    subcategory: {
      type: DataTypes.STRING(100),
    },
    description: {
      type: DataTypes.TEXT,
    },
    workspace: {
      type: DataTypes.STRING(100),
      defaultValue: 'municipal_planning',
    },
    url: {
      type: DataTypes.TEXT,
    },
    style: {
      type: DataTypes.STRING(100),
    },
    default_opacity: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 1.0,
    },
    default_visible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    min_scale: {
      type: DataTypes.INTEGER,
    },
    max_scale: {
      type: DataTypes.INTEGER,
    },
    queryable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    legend_url: {
      type: DataTypes.TEXT,
    },
    attribution: {
      type: DataTypes.STRING(500),
    },
    jurisdiction: {
      type: DataTypes.STRING(100),
    },
    municipality: {
      type: DataTypes.STRING(100),
    },
    srs: {
      type: DataTypes.STRING(50),
      defaultValue: 'EPSG:4326',
    },
    bbox: {
      type: DataTypes.ARRAY(DataTypes.DECIMAL),
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'gis_layers',
    schema: 'public',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['layer_name'] }
    ],
  });

  return GISLayer;
};
