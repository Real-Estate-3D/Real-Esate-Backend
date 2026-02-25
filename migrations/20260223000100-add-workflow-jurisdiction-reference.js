'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = { schema: 'public', tableName: 'workflows' };
    const table = await queryInterface.describeTable(tableName).catch(() => null);

    if (!table) return;

    if (!table.jurisdiction_id) {
      await queryInterface.addColumn(tableName, 'jurisdiction_id', {
        type: Sequelize.STRING(80),
        allowNull: true,
      });
    }

    if (!table.jurisdiction_tier_type) {
      await queryInterface.addColumn(tableName, 'jurisdiction_tier_type', {
        type: Sequelize.STRING(40),
        allowNull: true,
      });
    }

    await queryInterface.addIndex(tableName, ['jurisdiction_id'], {
      name: 'workflows_jurisdiction_id_idx',
    }).catch(() => {});

    await queryInterface.addIndex(tableName, ['jurisdiction_tier_type'], {
      name: 'workflows_jurisdiction_tier_type_idx',
    }).catch(() => {});
  },

  async down(queryInterface) {
    const tableName = { schema: 'public', tableName: 'workflows' };
    const table = await queryInterface.describeTable(tableName).catch(() => null);

    await queryInterface.removeIndex(tableName, 'workflows_jurisdiction_id_idx').catch(() => {});
    await queryInterface.removeIndex(tableName, 'workflows_jurisdiction_tier_type_idx').catch(() => {});

    if (table?.jurisdiction_tier_type) {
      await queryInterface.removeColumn(tableName, 'jurisdiction_tier_type');
    }
    if (table?.jurisdiction_id) {
      await queryInterface.removeColumn(tableName, 'jurisdiction_id');
    }
  },
};
