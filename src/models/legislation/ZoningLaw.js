// ZoningLaw Model - Zoning law records with parameters
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ZoningLaw = sequelize.define('ZoningLaw', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Zoning law number e.g., "143-B"'
    },
    type: {
      type: DataTypes.ENUM('Residential', 'Commercial', 'Industrial', 'Mixed-Use', 'Agricultural', 'Open Space'),
      allowNull: false,
      defaultValue: 'Residential'
    },
    effective_from: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    effective_to: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    validity_status: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Validation description e.g., "Violate provincial policy"'
    },
    status: {
      type: DataTypes.ENUM('Active', 'Valid', 'Expired', 'Pending', 'Draft', 'Superseded'),
      defaultValue: 'Draft',
      allowNull: false
    },
    zone_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Zone code identifier'
    },
    zone_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    full_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Full legal text of the zoning law'
    },
    // Zoning parameters stored as JSONB
    parameters: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of zoning parameters: [{label, value, unit}]'
    },
    // Geographic boundaries stored as JSONB (GeoJSON)
    geometry: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'GeoJSON geometry for the zone boundaries'
    },
    municipality: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    jurisdiction: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    legislation_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to parent zoning law for amendments'
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'zoning_laws',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['number'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['zone_code'] },
      { fields: ['municipality'] },
      { fields: ['legislation_id'] }
    ]
  });

  return ZoningLaw;
};
