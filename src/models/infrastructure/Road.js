// File: src/models/infrastructure/Road.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Road = sequelize.define('Road', {
    road_id: {
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
    road_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    street_suffix: {
      type: DataTypes.STRING(50),
    },
    street_direction: {
      type: DataTypes.STRING(50),
    },
    full_name: {
      type: DataTypes.STRING(254),
    },
    road_function: {
      type: DataTypes.STRING(50),
    },
    jurisdiction: {
      type: DataTypes.STRING(50),
    },
    municipality: {
      type: DataTypes.STRING(100),
    },
    regional_road: {
      type: DataTypes.STRING(50),
    },
    regional_road_number: {
      type: DataTypes.STRING(10),
    },
    from_address_left: {
      type: DataTypes.INTEGER,
    },
    to_address_left: {
      type: DataTypes.INTEGER,
    },
    from_address_right: {
      type: DataTypes.INTEGER,
    },
    to_address_right: {
      type: DataTypes.INTEGER,
    },
    parity_left: {
      type: DataTypes.STRING(10),
    },
    parity_right: {
      type: DataTypes.STRING(10),
    },
    from_node: {
      type: DataTypes.STRING(50),
    },
    to_node: {
      type: DataTypes.STRING(50),
    },
    length_m: {
      type: DataTypes.DECIMAL(15, 4),
    },
    facility_id: {
      type: DataTypes.STRING(100),
    },
    installation_date: {
      type: DataTypes.DATEONLY,
    },
    last_modified: {
      type: DataTypes.DATE,
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
    tableName: 'roads',
    schema: 'infrastructure',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Road;
};
