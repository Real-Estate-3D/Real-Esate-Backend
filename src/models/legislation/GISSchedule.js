// GISSchedule Model - GIS schedule attachments for legislation
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GISSchedule = sequelize.define('GISSchedule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    schedule_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Type: zoning_map, land_use_map, height_map, etc.'
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    file_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'File extension: shp, geojson, kml, etc.'
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // GeoJSON data stored directly
    geometry: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'GeoJSON geometry data'
    },
    // Style configuration for map display
    style: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Map styling: {fillColor, strokeColor, opacity, etc.}'
    },
    wms_layer: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'GeoServer WMS layer name'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'processing'),
      defaultValue: 'active'
    },
    legislation_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    zoning_law_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'gis_schedules',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['schedule_type'] },
      { fields: ['status'] },
      { fields: ['legislation_id'] },
      { fields: ['zoning_law_id'] }
    ]
  });

  return GISSchedule;
};
