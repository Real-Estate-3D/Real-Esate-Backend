'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, DATE, INTEGER, JSONB, DECIMAL, ARRAY } = Sequelize;

    // Helper: create table only if it does not already exist
    const safeCreateTable = async (tableName, columns, indexes = []) => {
      const existing = await queryInterface.describeTable({ tableName, schema: 'public' }).catch(() => null);
      if (existing) return;
      await queryInterface.createTable(tableName, columns);
      for (const idx of indexes) {
        await queryInterface.addIndex(tableName, idx.fields, { name: idx.name }).catch(() => {});
      }
    };

    // ------------------------------------------------------------------ //
    // 1.  workflows
    // ------------------------------------------------------------------ //
    await safeCreateTable('workflows', {
      id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
      name: { type: STRING(255), allowNull: false },
      description: { type: TEXT, allowNull: true },
      type: {
        type: STRING(30),
        allowNull: false,
        defaultValue: 'project-specific',
        comment: 'project-specific | municipal | template',
      },
      is_template: { type: BOOLEAN, allowNull: false, defaultValue: false },
      project: { type: STRING(255), allowNull: true },
      applies_to: { type: JSONB, allowNull: false, defaultValue: [] },
      status: {
        type: STRING(20),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active | inactive | draft | completed',
      },
      jurisdiction: { type: STRING(100), allowNull: true },
      jurisdiction_id: { type: STRING(80), allowNull: true },
      jurisdiction_tier_type: { type: STRING(40), allowNull: true },
      created_by: {
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
    }, [
      { fields: ['status'],                name: 'workflows_status_idx' },
      { fields: ['type'],                  name: 'workflows_type_idx' },
      { fields: ['is_template'],           name: 'workflows_is_template_idx' },
      { fields: ['jurisdiction'],          name: 'workflows_jurisdiction_idx' },
      { fields: ['jurisdiction_id'],       name: 'workflows_jurisdiction_id_idx' },
      { fields: ['jurisdiction_tier_type'],name: 'workflows_jurisdiction_tier_type_idx' },
    ]);

    // ------------------------------------------------------------------ //
    // 2.  workflow_steps
    // ------------------------------------------------------------------ //
    await safeCreateTable('workflow_steps', {
      id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
      workflow_id: {
        type: UUID,
        allowNull: false,
        references: { model: { tableName: 'workflows', schema: 'public' }, key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: { type: STRING(255), allowNull: false },
      description: { type: TEXT, allowNull: true },
      step_order: { type: INTEGER, allowNull: false, defaultValue: 1 },
      step_type: {
        type: STRING(30),
        allowNull: false,
        defaultValue: 'review',
        comment: 'submission | review | approval | notification | inspection | finalization',
      },
      required: { type: BOOLEAN, defaultValue: true },
      duration_days: { type: INTEGER, allowNull: true },
      assignee_role: { type: STRING(100), allowNull: true },
      required_documents: { type: JSONB, allowNull: false, defaultValue: [] },
      related_legislation: { type: JSONB, allowNull: false, defaultValue: [] },
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
    }, [
      { fields: ['workflow_id'], name: 'workflow_steps_workflow_id_idx' },
      { fields: ['step_order'],  name: 'workflow_steps_step_order_idx' },
    ]);

    // ------------------------------------------------------------------ //
    // 3.  legislations
    // ------------------------------------------------------------------ //
    await safeCreateTable('legislations', {
      id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
      title: { type: STRING(255), allowNull: false },
      process: {
        type: STRING(255),
        allowNull: true,
        comment: 'Process steps e.g. "Submission, Review, Approval"',
      },
      status: {
        type: STRING(30),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'active | pending | awaiting-approval | rejected | cancelled | draft | completed',
      },
      legislation_type: {
        type: STRING(100),
        allowNull: true,
        comment: 'Zoning By-law | Site-Specific Zoning | Official Plan | etc.',
      },
      effective_from: { type: DATE, allowNull: true },
      effective_to:   { type: DATE, allowNull: true },
      jurisdiction:   { type: STRING(100), allowNull: true },
      municipality:   { type: STRING(100), allowNull: true },
      description:    { type: TEXT, allowNull: true },
      full_text:      { type: TEXT, allowNull: true },
      workflow_id: {
        type: UUID,
        allowNull: true,
        references: { model: { tableName: 'workflows', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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
    }, [
      { fields: ['status'],           name: 'legislations_status_idx' },
      { fields: ['legislation_type'], name: 'legislations_type_idx' },
      { fields: ['jurisdiction'],     name: 'legislations_jurisdiction_idx' },
      { fields: ['municipality'],     name: 'legislations_municipality_idx' },
      { fields: ['effective_from'],   name: 'legislations_effective_from_idx' },
    ]);

    // ------------------------------------------------------------------ //
    // 4.  legislation_versions
    // ------------------------------------------------------------------ //
    await safeCreateTable('legislation_versions', {
      id: {
        type: INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      legislation_id: {
        type: UUID,
        allowNull: false,
        references: { model: { tableName: 'legislations', schema: 'public' }, key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      version_number: { type: INTEGER, allowNull: false },
      title: { type: STRING(500), allowNull: false },
      content: { type: TEXT, allowNull: true },
      changes_summary: { type: TEXT, allowNull: true },
      snapshot: { type: JSONB, allowNull: true, comment: 'Full snapshot at this version' },
      status: {
        type: STRING(20),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'draft | pending | approved | rejected',
      },
      created_by: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      approved_by: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      approved_at: { type: DATE, allowNull: true },
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
    }, [
      { fields: ['legislation_id'],                   name: 'legislation_versions_legislation_id_idx' },
      { fields: ['legislation_id', 'version_number'], name: 'legislation_versions_unique_idx' },
    ]);

    // ------------------------------------------------------------------ //
    // 5.  legislation_branches
    // ------------------------------------------------------------------ //
    await safeCreateTable('legislation_branches', {
      id: {
        type: INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      legislation_id: {
        type: UUID,
        allowNull: false,
        references: { model: { tableName: 'legislations', schema: 'public' }, key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: { type: STRING(255), allowNull: false },
      description: { type: TEXT, allowNull: true },
      parent_branch_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'legislation_branches', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      base_version_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'legislation_versions', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      status: {
        type: STRING(20),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active | merged | closed | archived',
      },
      is_main: { type: BOOLEAN, allowNull: false, defaultValue: false },
      merged_at: { type: DATE, allowNull: true },
      merged_by: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      merged_into_branch_id: { type: INTEGER, allowNull: true },
      created_by: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      metadata: { type: JSONB, allowNull: false, defaultValue: {} },
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
    }, [
      { fields: ['legislation_id'], name: 'legislation_branches_legislation_id_idx' },
      { fields: ['status'],         name: 'legislation_branches_status_idx' },
    ]);

    // ------------------------------------------------------------------ //
    // 6.  zoning_laws
    // ------------------------------------------------------------------ //
    await safeCreateTable('zoning_laws', {
      id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
      title: { type: STRING(255), allowNull: false },
      number: {
        type: STRING(50),
        allowNull: true,
        comment: 'e.g. "143-B"',
      },
      type: {
        type: STRING(50),
        allowNull: false,
        defaultValue: 'Residential',
        comment: 'Residential | Commercial | Industrial | Mixed-Use | Agricultural | Open Space',
      },
      effective_from:   { type: DATE, allowNull: true },
      effective_to:     { type: DATE, allowNull: true },
      validity_status:  { type: STRING(100), allowNull: true },
      status: {
        type: STRING(20),
        allowNull: false,
        defaultValue: 'Draft',
        comment: 'Active | Valid | Expired | Pending | Draft | Superseded',
      },
      zone_code:    { type: STRING(50), allowNull: true },
      zone_name:    { type: STRING(255), allowNull: true },
      description:  { type: TEXT, allowNull: true },
      full_text:    { type: TEXT, allowNull: true },
      parameters:   { type: JSONB, allowNull: true, defaultValue: [], comment: '[{label, value, unit}]' },
      geometry:     { type: JSONB, allowNull: true, comment: 'GeoJSON geometry' },
      municipality: { type: STRING(100), allowNull: true },
      jurisdiction: { type: STRING(100), allowNull: true },
      legislation_id: {
        type: UUID,
        allowNull: true,
        references: { model: { tableName: 'legislations', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      parent_id: {
        type: UUID,
        allowNull: true,
        references: { model: { tableName: 'zoning_laws', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      version: { type: INTEGER, allowNull: false, defaultValue: 1 },
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
    }, [
      { fields: ['number'],         name: 'zoning_laws_number_idx' },
      { fields: ['type'],           name: 'zoning_laws_type_idx' },
      { fields: ['status'],         name: 'zoning_laws_status_idx' },
      { fields: ['zone_code'],      name: 'zoning_laws_zone_code_idx' },
      { fields: ['municipality'],   name: 'zoning_laws_municipality_idx' },
      { fields: ['legislation_id'], name: 'zoning_laws_legislation_id_idx' },
    ]);

    // ------------------------------------------------------------------ //
    // 7.  policies
    // ------------------------------------------------------------------ //
    await safeCreateTable('policies', {
      id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
      name: { type: STRING(255), allowNull: false },
      category: {
        type: STRING(100),
        allowNull: false,
        comment: 'Environmental | Zoning | Safety | etc.',
      },
      rules:      { type: TEXT, allowNull: true },
      full_text:  { type: TEXT, allowNull: true },
      parameters: { type: JSONB, allowNull: true, defaultValue: [], comment: '[{label, value, unit}]' },
      status: {
        type: STRING(20),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active | inactive | draft | pending',
      },
      effective_from: { type: DATE, allowNull: true },
      effective_to:   { type: DATE, allowNull: true },
      jurisdiction:   { type: STRING(100), allowNull: true },
      municipality:   { type: STRING(100), allowNull: true },
      legislation_id: {
        type: UUID,
        allowNull: true,
        references: { model: { tableName: 'legislations', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      version: { type: INTEGER, allowNull: false, defaultValue: 1 },
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
    }, [
      { fields: ['category'],       name: 'policies_category_idx' },
      { fields: ['status'],         name: 'policies_status_idx' },
      { fields: ['jurisdiction'],   name: 'policies_jurisdiction_idx' },
      { fields: ['legislation_id'], name: 'policies_legislation_id_idx' },
    ]);

    // ------------------------------------------------------------------ //
    // 8.  gis_layers
    // ------------------------------------------------------------------ //
    await safeCreateTable('gis_layers', {
      id: { type: INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
      name: { type: STRING(255), allowNull: false },
      layer_name: {
        type: STRING(255),
        allowNull: false,
        unique: true,
        comment: 'GeoServer layer name',
      },
      layer_type: {
        type: STRING(20),
        allowNull: false,
        defaultValue: 'WMS',
        comment: 'WMS | WFS | WMTS | TileLayer | GeoJSON',
      },
      category:    { type: STRING(100), allowNull: true },
      subcategory: { type: STRING(100), allowNull: true },
      description: { type: TEXT, allowNull: true },
      workspace:   { type: STRING(100), allowNull: true, defaultValue: 'municipal_planning' },
      url:         { type: TEXT, allowNull: true },
      style:       { type: STRING(100), allowNull: true },
      default_opacity:  { type: DECIMAL(3, 2), allowNull: false, defaultValue: 1.0 },
      default_visible:  { type: BOOLEAN, allowNull: false, defaultValue: false },
      min_scale:   { type: INTEGER, allowNull: true },
      max_scale:   { type: INTEGER, allowNull: true },
      queryable:   { type: BOOLEAN, allowNull: false, defaultValue: true },
      legend_url:  { type: TEXT, allowNull: true },
      attribution: { type: STRING(500), allowNull: true },
      jurisdiction:  { type: STRING(100), allowNull: true },
      municipality:  { type: STRING(100), allowNull: true },
      srs:           { type: STRING(50), allowNull: true, defaultValue: 'EPSG:4326' },
      is_active:     { type: BOOLEAN, allowNull: false, defaultValue: true },
      display_order: { type: INTEGER, allowNull: false, defaultValue: 0 },
      metadata:      { type: JSONB, allowNull: false, defaultValue: {} },
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
    }, [
      { fields: ['layer_name'],     name: 'gis_layers_layer_name_unique_idx' },
      { fields: ['category'],       name: 'gis_layers_category_idx' },
      { fields: ['is_active'],      name: 'gis_layers_is_active_idx' },
    ]);

    // ------------------------------------------------------------------ //
    // 9.  gis_schedules
    // ------------------------------------------------------------------ //
    await safeCreateTable('gis_schedules', {
      id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
      name: { type: STRING(255), allowNull: false },
      schedule_type: {
        type: STRING(100),
        allowNull: false,
        comment: 'zoning_map | land_use_map | height_map | etc.',
      },
      file_path: { type: STRING(500), allowNull: true },
      file_type: { type: STRING(50), allowNull: true },
      file_size: { type: INTEGER, allowNull: true },
      geometry:  { type: JSONB, allowNull: true, comment: 'GeoJSON geometry' },
      style:     { type: JSONB, allowNull: true, defaultValue: {} },
      wms_layer: { type: STRING(255), allowNull: true },
      status: {
        type: STRING(20),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active | inactive | processing',
      },
      legislation_id: {
        type: UUID,
        allowNull: true,
        references: { model: { tableName: 'legislations', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      zoning_law_id: {
        type: UUID,
        allowNull: true,
        references: { model: { tableName: 'zoning_laws', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      gis_layer_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'gis_layers', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_by: {
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
    }, [
      { fields: ['schedule_type'],  name: 'gis_schedules_schedule_type_idx' },
      { fields: ['status'],         name: 'gis_schedules_status_idx' },
      { fields: ['legislation_id'], name: 'gis_schedules_legislation_id_idx' },
      { fields: ['zoning_law_id'],  name: 'gis_schedules_zoning_law_id_idx' },
    ]);

    // ------------------------------------------------------------------ //
    // 10.  change_history
    // ------------------------------------------------------------------ //
    await safeCreateTable('change_history', {
      id: { type: UUID, allowNull: false, primaryKey: true, defaultValue: UUIDV4 },
      date: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      description: { type: TEXT, allowNull: false },
      change_type: {
        type: STRING(30),
        allowNull: false,
        defaultValue: 'updated',
        comment: 'created | updated | deleted | published | approved | rejected | version_created',
      },
      affected_entities: { type: JSONB, allowNull: true, defaultValue: [] },
      previous_values:   { type: JSONB, allowNull: true },
      new_values:        { type: JSONB, allowNull: true },
      legislation_id: {
        type: UUID,
        allowNull: true,
        references: { model: { tableName: 'legislations', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      zoning_law_id: {
        type: UUID,
        allowNull: true,
        references: { model: { tableName: 'zoning_laws', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      policy_id: {
        type: UUID,
        allowNull: true,
        references: { model: { tableName: 'policies', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: { tableName: 'users', schema: 'public' }, key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      user_name: { type: STRING(255), allowNull: true },
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
    }, [
      { fields: ['date'],           name: 'change_history_date_idx' },
      { fields: ['change_type'],    name: 'change_history_change_type_idx' },
      { fields: ['legislation_id'], name: 'change_history_legislation_id_idx' },
      { fields: ['zoning_law_id'],  name: 'change_history_zoning_law_id_idx' },
      { fields: ['user_id'],        name: 'change_history_user_id_idx' },
    ]);
  },

  async down(queryInterface) {
    // Drop in reverse order (respecting FK dependencies)
    await queryInterface.dropTable('change_history').catch(() => {});
    await queryInterface.dropTable('gis_schedules').catch(() => {});
    await queryInterface.dropTable('gis_layers').catch(() => {});
    await queryInterface.dropTable('policies').catch(() => {});
    await queryInterface.dropTable('zoning_laws').catch(() => {});
    await queryInterface.dropTable('legislation_branches').catch(() => {});
    await queryInterface.dropTable('legislation_versions').catch(() => {});
    await queryInterface.dropTable('legislations').catch(() => {});
    await queryInterface.dropTable('workflow_steps').catch(() => {});
    await queryInterface.dropTable('workflows').catch(() => {});
  },
};
