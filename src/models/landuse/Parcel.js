// File: src/models/landuse/Parcel.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Parcel = sequelize.define('Parcel', {
    parcel_id: {
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
    arn: {
      type: DataTypes.STRING(200),
    },
    pin: {
      type: DataTypes.STRING(50),
    },
    trunk_roll: {
      type: DataTypes.STRING(50),
    },
    lot_number: {
      type: DataTypes.STRING(100),
    },
    plan_number: {
      type: DataTypes.STRING(100),
    },
    legal_description: {
      type: DataTypes.TEXT,
    },
    mpac_code: {
      type: DataTypes.STRING(50),
    },
    address: {
      type: DataTypes.STRING(254),
    },
    street_name: {
      type: DataTypes.STRING(100),
    },
    street_type: {
      type: DataTypes.STRING(50),
    },
    municipality: {
      type: DataTypes.STRING(100),
    },
    full_address: {
      type: DataTypes.STRING(254),
    },
    area_sq_m: {
      type: DataTypes.DECIMAL(15, 4),
    },
    area_ha: {
      type: DataTypes.DECIMAL(15, 6),
    },
    area_ac: {
      type: DataTypes.DECIMAL(15, 6),
    },
    x_coord: {
      type: DataTypes.DECIMAL(15, 8),
    },
    y_coord: {
      type: DataTypes.DECIMAL(15, 8),
    },
    notes: {
      type: DataTypes.TEXT,
    },
    geom: {
      type: DataTypes.GEOMETRY('MULTIPOLYGON', 4326),
      allowNull: false,
    },
    centroid: {
      type: DataTypes.GEOMETRY('POINT', 4326),
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  }, {
    tableName: 'parcels',
    schema: 'landuse',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Parcel;
};
