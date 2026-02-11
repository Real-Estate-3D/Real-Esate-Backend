'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      { schema: 'organization', tableName: 'org_role' },
      'permissions',
      {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      }
    );

    await queryInterface.addColumn(
      { schema: 'organization', tableName: 'org_role' },
      'permission_schema_version',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      }
    );

    await queryInterface.sequelize.query(`
      UPDATE organization.org_role
      SET permission_schema_version = CASE
        WHEN jsonb_typeof(permissions) = 'object' THEN 2
        ELSE 1
      END;
    `);

    await queryInterface.sequelize.query('CREATE SCHEMA IF NOT EXISTS "boundaries";');
    await queryInterface.createTable(
      { schema: 'boundaries', tableName: 'municipality_availability' },
      {
        id: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        tier_type: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        municipality_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'available',
        },
        has_data: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        note: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }
    );

    await queryInterface.addConstraint(
      { schema: 'boundaries', tableName: 'municipality_availability' },
      {
        type: 'unique',
        fields: ['tier_type', 'municipality_id'],
        name: 'municipality_availability_tier_id_unique',
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ schema: 'boundaries', tableName: 'municipality_availability' });

    await queryInterface.removeColumn(
      { schema: 'organization', tableName: 'org_role' },
      'permission_schema_version'
    );

    await queryInterface.changeColumn(
      { schema: 'organization', tableName: 'org_role' },
      'permissions',
      {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      }
    );
  },
};
