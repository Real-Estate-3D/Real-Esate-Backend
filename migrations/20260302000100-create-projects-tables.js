'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, DATE, INTEGER, JSONB } = Sequelize;

    // ------------------------------------------------------------------ //
    // 1. projects  (main record)
    // ------------------------------------------------------------------ //
    await queryInterface.createTable('projects', {
      id: {
        type: UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: UUIDV4,
      },
      name: { type: STRING(255), allowNull: false },
      applicant: { type: STRING(255), allowNull: false },
      project_type: {
        type: STRING(50),
        allowNull: true,
        comment: 'residential | commercial | mixed_use | industrial | institutional',
      },
      description: { type: TEXT, allowNull: true },
      location: { type: STRING(500), allowNull: true },
      status: {
        type: STRING(40),
        allowNull: false,
        defaultValue: 'pending_review',
        comment: 'pending_review | in_progress | approved | rejected | revision_requested',
      },
      submitted_date: { type: DATE, allowNull: true },
      // Parcel reference
      parcel_id: { type: STRING(100), allowNull: true },
      parcel_address: { type: STRING(500), allowNull: true },
      // Zoning
      proposed_zoning: { type: STRING(100), allowNull: true },
      use_site_specific_zoning: { type: BOOLEAN, allowNull: false, defaultValue: false },
      // JSONB blobs
      zoning_info: {
        type: JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'currentZoning, landArea, officialPlanDesignation, specialProvisions, environmentalSensitivity',
      },
      compliance: {
        type: JSONB,
        allowNull: false,
        defaultValue: {},
        comment: '{ percentage: number, items: [{ id, name, status, notes }] }',
      },
      documents: {
        type: JSONB,
        allowNull: false,
        defaultValue: [],
        comment: '[{ id, name, size, type }]',
      },
      model_3d: {
        type: JSONB,
        allowNull: false,
        defaultValue: {},
        comment: '{ fileName, size }',
      },
      legislative_change_request: {
        type: JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Site-specific legislative change request details',
      },
      created_by: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      updated_by: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('projects', ['status'],       { name: 'projects_status_idx' });
    await queryInterface.addIndex('projects', ['project_type'], { name: 'projects_project_type_idx' });
    await queryInterface.addIndex('projects', ['applicant'],    { name: 'projects_applicant_idx' });
    await queryInterface.addIndex('projects', ['created_at'],   { name: 'projects_created_at_idx' });

    // ------------------------------------------------------------------ //
    // 2. project_comments  (one project → many comments)
    // ------------------------------------------------------------------ //
    await queryInterface.createTable('project_comments', {
      id: {
        type: UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: UUIDV4,
      },
      project_id: {
        type: UUID,
        allowNull: false,
        references: { model: { tableName: 'projects', schema: 'public' }, key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      author_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      author_name: { type: STRING(255), allowNull: false },
      author_role: { type: STRING(100), allowNull: true },
      text: { type: TEXT, allowNull: false },
      created_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('project_comments', ['project_id'], {
      name: 'project_comments_project_id_idx',
    });

    // ------------------------------------------------------------------ //
    // 3. project_history  (immutable audit trail / timeline — no updated_at)
    // ------------------------------------------------------------------ //
    await queryInterface.createTable('project_history', {
      id: {
        type: UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: UUIDV4,
      },
      project_id: {
        type: UUID,
        allowNull: false,
        references: { model: { tableName: 'projects', schema: 'public' }, key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      action: {
        type: STRING(50),
        allowNull: false,
        comment: 'created | updated | approved | rejected | revision_requested | commented',
      },
      actor_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      actor_name: { type: STRING(255), allowNull: false },
      note: { type: TEXT, allowNull: true },
      created_at: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('project_history', ['project_id'], {
      name: 'project_history_project_id_idx',
    });
    await queryInterface.addIndex('project_history', ['action'], {
      name: 'project_history_action_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('project_history');
    await queryInterface.dropTable('project_comments');
    await queryInterface.dropTable('projects');
  },
};
