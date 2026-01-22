// File: src/models/infrastructure/Trail.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Trail = sequelize.define('Trail', {
    trail_id: {
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
    trail_name: {
      type: DataTypes.STRING(254),
    },
    trail_type: {
      type: DataTypes.STRING(100),
    },
    surface_type: {
      type: DataTypes.STRING(100),
    },
    status: {
      type: DataTypes.STRING(50),
    },
    width_m: {
      type: DataTypes.DECIMAL(8, 2),
    },
    length_m: {
      type: DataTypes.DECIMAL(15, 4),
    },
    grade: {
      type: DataTypes.STRING(50),
    },
    lighting: {
      type: DataTypes.BOOLEAN,
    },
    amenities: {
      type: DataTypes.TEXT,
    },
    location_description: {
      type: DataTypes.TEXT,
    },
    from_location: {
      type: DataTypes.STRING(254),
    },
    to_location: {
      type: DataTypes.STRING(254),
    },
    park_name: {
      type: DataTypes.STRING(254),
    },
    asset_id: {
      type: DataTypes.STRING(50),
    },
    facility_id: {
      type: DataTypes.STRING(100),
    },
    installation_date: {
      type: DataTypes.DATEONLY,
    },
    year_built: {
      type: DataTypes.INTEGER,
    },
    condition: {
      type: DataTypes.STRING(50),
    },
    last_inspection: {
      type: DataTypes.DATEONLY,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    geom: {
      type: DataTypes.GEOMETRY('MULTILINESTRING', 4326),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  }, {
    tableName: 'trails',
    schema: 'infrastructure',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Trail;
};
