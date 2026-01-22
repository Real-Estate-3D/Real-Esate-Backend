// File: src/models/infrastructure/AddressPoint.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AddressPoint = sequelize.define('AddressPoint', {
    address_id: {
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
    ward_id: {
      type: DataTypes.INTEGER,
    },
    object_id: {
      type: DataTypes.STRING(50),
    },
    civic_number: {
      type: DataTypes.STRING(20),
    },
    street_name: {
      type: DataTypes.STRING(100),
    },
    street_type: {
      type: DataTypes.STRING(50),
    },
    street_suffix: {
      type: DataTypes.STRING(50),
    },
    street_direction: {
      type: DataTypes.STRING(20),
    },
    full_address: {
      type: DataTypes.STRING(254),
      allowNull: false,
    },
    municipality: {
      type: DataTypes.STRING(100),
    },
    postal_code: {
      type: DataTypes.STRING(10),
    },
    unit_number: {
      type: DataTypes.STRING(20),
    },
    pin: {
      type: DataTypes.STRING(50),
    },
    arn: {
      type: DataTypes.STRING(50),
    },
    facility_id: {
      type: DataTypes.STRING(100),
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
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
    },
  }, {
    tableName: 'address_points',
    schema: 'infrastructure',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return AddressPoint;
};
