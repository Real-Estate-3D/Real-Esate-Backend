'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, DATE, INTEGER, JSONB } = Sequelize;

    // ------------------------------------------------------------------ //
    // 1. approvals  (main record)
    // ------------------------------------------------------------------ //
    await queryInterface.createTable('approvals', {
      id: {
        type: UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: UUIDV4,
      },
      name: { type: STRING(255), allowNull: false },
      project: { type: STRING(255), allowNull: true },
      applicant: { type: STRING(255), allowNull: false },
      location: { type: STRING(500), allowNull: true },
      description: { type: TEXT, allowNull: true },
      status: {
        type: STRING(40),
        allowNull: false,
        defaultValue: 'pending_review',
        comment: 'pending_review | assigned | approved | rejected | revision_requested',
      },
      submitted_date: { type: DATE, allowNull: true },
      // Reviewer stored as JSONB snapshot: { id, name, role, email }
      assigned_reviewer: { type: JSONB, allowNull: true },
      // JSONB blobs for structured detail data
      zoning_info: { type: JSONB, allowNull: false, defaultValue: {} },
      legislation_details: { type: JSONB, allowNull: false, defaultValue: {} },
      site_plan: { type: JSONB, allowNull: false, defaultValue: {} },
      legislative_compliance: { type: JSONB, allowNull: false, defaultValue: [] },
      required_studies: { type: JSONB, allowNull: false, defaultValue: [] },
      workflow_steps: { type: JSONB, allowNull: false, defaultValue: [] },
      documents: { type: JSONB, allowNull: false, defaultValue: [] },
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

    await queryInterface.addIndex('approvals', ['status'], { name: 'approvals_status_idx' });
    await queryInterface.addIndex('approvals', ['applicant'], { name: 'approvals_applicant_idx' });
    await queryInterface.addIndex('approvals', ['created_at'], { name: 'approvals_created_at_idx' });

    // ------------------------------------------------------------------ //
    // 2. approval_comments  (one approval → many comments)
    // ------------------------------------------------------------------ //
    await queryInterface.createTable('approval_comments', {
      id: {
        type: UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: UUIDV4,
      },
      approval_id: {
        type: UUID,
        allowNull: false,
        references: { model: { tableName: 'approvals', schema: 'public' }, key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      // Nullable — allows linking to a real user later
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

    await queryInterface.addIndex('approval_comments', ['approval_id'], {
      name: 'approval_comments_approval_id_idx',
    });

    // ------------------------------------------------------------------ //
    // 3. approval_history  (immutable audit trail — no updated_at)
    // ------------------------------------------------------------------ //
    await queryInterface.createTable('approval_history', {
      id: {
        type: UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: UUIDV4,
      },
      approval_id: {
        type: UUID,
        allowNull: false,
        references: { model: { tableName: 'approvals', schema: 'public' }, key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      action: {
        type: STRING(50),
        allowNull: false,
        comment: 'created | assigned | approved | rejected | revision_requested | commented',
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

    await queryInterface.addIndex('approval_history', ['approval_id'], {
      name: 'approval_history_approval_id_idx',
    });
    await queryInterface.addIndex('approval_history', ['action'], {
      name: 'approval_history_action_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('approval_history');
    await queryInterface.dropTable('approval_comments');
    await queryInterface.dropTable('approvals');
  },
};
