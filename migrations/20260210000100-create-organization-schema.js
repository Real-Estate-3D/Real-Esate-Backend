'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, DATE, INTEGER, JSONB, DECIMAL } = Sequelize;

    await queryInterface.sequelize.query('CREATE SCHEMA IF NOT EXISTS "organization";');

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'organizations' },
      {
        id: {
          type: UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: UUIDV4,
        },
        name: { type: STRING(255), allowNull: false },
        street_address_1: { type: STRING(255) },
        street_address_2: { type: STRING(255) },
        city: { type: STRING(120) },
        state_region: { type: STRING(120) },
        postal_zip: { type: STRING(40) },
        country: { type: STRING(120) },
        website: { type: STRING(255) },
        primary_contact_email: { type: STRING(255) },
        logo_url: { type: STRING(500) },
        setup_status: {
          type: STRING(40),
          allowNull: false,
          defaultValue: 'not_started',
        },
        setup_completed_at: { type: DATE },
        setup_skipped_at: { type: DATE },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        created_by: {
          type: INTEGER,
          references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        updated_by: {
          type: INTEGER,
          references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'position' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        name: { type: STRING(150), allowNull: false },
        is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: DATE },
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'position' },
      {
        type: 'unique',
        fields: ['organization_id', 'name'],
        name: 'position_organization_name_unique',
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'org_role' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        name: { type: STRING(150), allowNull: false },
        permissions: { type: JSONB, allowNull: false, defaultValue: [] },
        is_system: { type: BOOLEAN, allowNull: false, defaultValue: false },
        is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: DATE },
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'org_role' },
      {
        type: 'unique',
        fields: ['organization_id', 'name'],
        name: 'org_role_organization_name_unique',
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'department' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        name: { type: STRING(255), allowNull: false },
        status: { type: STRING(50), allowNull: false, defaultValue: 'active' },
        head_member_id: { type: UUID },
        parent_department_id: {
          type: UUID,
          references: { model: { schema: 'organization', tableName: 'department' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: DATE },
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'department' },
      {
        type: 'unique',
        fields: ['organization_id', 'name'],
        name: 'department_organization_name_unique',
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'team' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        department_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'department' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        name: { type: STRING(255), allowNull: false },
        lead_member_id: { type: UUID },
        status: { type: STRING(50), allowNull: false, defaultValue: 'active' },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: DATE },
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'team' },
      {
        type: 'unique',
        fields: ['organization_id', 'department_id', 'name'],
        name: 'team_organization_department_name_unique',
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'organization_members' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        user_id: {
          type: INTEGER,
          allowNull: false,
          references: { model: { schema: 'public', tableName: 'users' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        department_id: {
          type: UUID,
          references: { model: { schema: 'organization', tableName: 'department' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        team_id: {
          type: UUID,
          references: { model: { schema: 'organization', tableName: 'team' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        position_id: {
          type: UUID,
          references: { model: { schema: 'organization', tableName: 'position' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        org_role_id: {
          type: UUID,
          references: { model: { schema: 'organization', tableName: 'org_role' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        reports_to_member_id: { type: UUID },
        status: { type: STRING(50), allowNull: false, defaultValue: 'active' },
        is_org_admin: { type: BOOLEAN, allowNull: false, defaultValue: false },
        invited_by: {
          type: INTEGER,
          references: { model: { schema: 'public', tableName: 'users' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        invited_at: { type: DATE },
        deactivated_at: { type: DATE },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'organization_members' },
      {
        type: 'unique',
        fields: ['organization_id', 'user_id'],
        name: 'organization_members_organization_user_unique',
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'organization_members' },
      {
        fields: ['reports_to_member_id'],
        type: 'foreign key',
        name: 'organization_members_reports_to_fk',
        references: { table: { schema: 'organization', tableName: 'organization_members' }, field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'department' },
      {
        fields: ['head_member_id'],
        type: 'foreign key',
        name: 'department_head_member_fk',
        references: { table: { schema: 'organization', tableName: 'organization_members' }, field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'team' },
      {
        fields: ['lead_member_id'],
        type: 'foreign key',
        name: 'team_lead_member_fk',
        references: { table: { schema: 'organization', tableName: 'organization_members' }, field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'team_member' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        team_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'team' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        organization_member_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organization_members' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'team_member' },
      {
        type: 'unique',
        fields: ['team_id', 'organization_member_id'],
        name: 'team_member_team_member_unique',
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'invitation' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        email: { type: STRING(255), allowNull: false },
        status: { type: STRING(50), allowNull: false, defaultValue: 'pending' },
        invite_token: { type: STRING(255), allowNull: false },
        expires_at: { type: DATE },
        invited_by: {
          type: INTEGER,
          references: { model: { schema: 'public', tableName: 'users' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'org_chart_node_state' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        organization_member_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organization_members' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        collapsed: { type: BOOLEAN, allowNull: false, defaultValue: false },
        position_x: { type: DECIMAL(12, 3) },
        position_y: { type: DECIMAL(12, 3) },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }
    );

    await queryInterface.addConstraint(
      { schema: 'organization', tableName: 'org_chart_node_state' },
      {
        type: 'unique',
        fields: ['organization_id', 'organization_member_id'],
        name: 'org_chart_node_state_organization_member_unique',
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'org_audit_log' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        actor_user_id: {
          type: INTEGER,
          references: { model: { schema: 'public', tableName: 'users' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        entity_type: { type: STRING(80), allowNull: false },
        entity_id: { type: STRING(80), allowNull: false },
        department_id: {
          type: UUID,
          references: { model: { schema: 'organization', tableName: 'department' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        action: { type: STRING(80), allowNull: false },
        message: { type: TEXT, allowNull: false },
        previous_values: { type: JSONB, allowNull: false, defaultValue: {} },
        new_values: { type: JSONB, allowNull: false, defaultValue: {} },
        metadata: { type: JSONB, allowNull: false, defaultValue: {} },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }
    );

    await queryInterface.createTable(
      { schema: 'organization', tableName: 'import_job' },
      {
        id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
        organization_id: {
          type: UUID,
          allowNull: false,
          references: { model: { schema: 'organization', tableName: 'organizations' }, key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        entity: { type: STRING(40), allowNull: false },
        format: { type: STRING(10), allowNull: false },
        status: { type: STRING(40), allowNull: false, defaultValue: 'processing' },
        total_rows: { type: INTEGER, allowNull: false, defaultValue: 0 },
        success_rows: { type: INTEGER, allowNull: false, defaultValue: 0 },
        failed_rows: { type: INTEGER, allowNull: false, defaultValue: 0 },
        report: { type: JSONB, allowNull: false, defaultValue: {} },
        uploaded_by: {
          type: INTEGER,
          references: { model: { schema: 'public', tableName: 'users' }, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: 'organization', tableName: 'import_job' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'org_audit_log' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'org_chart_node_state' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'invitation' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'team_member' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'organization_members' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'team' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'department' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'org_role' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'position' });
    await queryInterface.dropTable({ schema: 'organization', tableName: 'organizations' });
    await queryInterface.sequelize.query('DROP SCHEMA IF EXISTS "organization" CASCADE;');
  },
};
