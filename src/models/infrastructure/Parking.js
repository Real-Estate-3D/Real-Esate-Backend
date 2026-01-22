// File: src/models/infrastructure/Parking.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Parking = sequelize.define('Parking', {
    parking_id: {
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
    parking_name: {
      type: DataTypes.STRING(254),
    },
    parking_type: {
      type: DataTypes.STRING(100),
    },
    description: {
      type: DataTypes.TEXT,
    },
    facility_id: {
      type: DataTypes.STRING(100),
    },
    asset_id: {
      type: DataTypes.STRING(100),
    },
    capacity: {
      type: DataTypes.INTEGER,
    },
    surface_type: {
      type: DataTypes.STRING(100),
    },
    status: {
      type: DataTypes.STRING(50),
    },
    installation_date: {
      type: DataTypes.DATEONLY,
    },
    maintenance_date: {
      type: DataTypes.DATEONLY,
    },
    inspection_date: {
      type: DataTypes.DATEONLY,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    geom: {
      type: DataTypes.GEOMETRY('GEOMETRY', 4326),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  }, {
    tableName: 'parking',
    schema: 'infrastructure',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Parking;
};
