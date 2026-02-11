const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Organization = sequelize.define(
    'Organization',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      street_address_1: DataTypes.STRING(255),
      street_address_2: DataTypes.STRING(255),
      city: DataTypes.STRING(120),
      state_region: DataTypes.STRING(120),
      postal_zip: DataTypes.STRING(40),
      country: DataTypes.STRING(120),
      website: DataTypes.STRING(255),
      primary_contact_email: DataTypes.STRING(255),
      logo_url: DataTypes.STRING(500),
      setup_status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'not_started',
      },
      setup_completed_at: DataTypes.DATE,
      setup_skipped_at: DataTypes.DATE,
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_by: DataTypes.INTEGER,
      updated_by: DataTypes.INTEGER,
    },
    {
      tableName: 'organizations',
      schema: 'organization',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Organization;
};

