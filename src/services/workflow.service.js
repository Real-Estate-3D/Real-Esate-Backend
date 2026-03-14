'use strict';

const { Op } = require('sequelize');
const { Legislation, Workflow, WorkflowStep, sequelize } = require('../models');
const {
  VALID_WORKFLOW_STATUSES,
  VALID_WORKFLOW_TYPES,
  VALID_JURISDICTION_TIER_TYPES,
  mapWorkflowRecord,
  normalizeWorkflowPayload,
} = require('../controllers/workflow.helpers');

// ─────────────────────────────────────────────────────────────────────────────
// Shared Sequelize query constants
// ─────────────────────────────────────────────────────────────────────────────

const WORKFLOW_INCLUDE = [
  {
    model: WorkflowStep,
    as: 'steps',
    required: false,
  },
];

const WORKFLOW_ORDER = [
  ['updated_at', 'DESC'],
  [{ model: WorkflowStep, as: 'steps' }, 'step_order', 'ASC'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const normalizeFilterString = (value) =>
  value === undefined || value === null ? '' : String(value).trim().toLowerCase();

const normalizeTierType = (value) => {
  const normalized = normalizeFilterString(value);
  if (!normalized) return null;
  return VALID_JURISDICTION_TIER_TYPES.includes(normalized) ? normalized : null;
};

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const ALL_MUNICIPALITIES_RELATION = 'boundaries.all_municipalities';
const MUNICIPALITY_FALLBACK_SOURCE = `
  (
    SELECT
      COALESCE(NULLIF(TRIM(admin_id::TEXT), ''), single_tier_id::TEXT) AS municipality_id,
      'single_tier'::TEXT AS tier_type,
      admin_name,
      geom
    FROM boundaries.single_tier
    UNION ALL
    SELECT
      COALESCE(NULLIF(TRIM(admin_id::TEXT), ''), lower_tier_id::TEXT) AS municipality_id,
      'lower_tier'::TEXT AS tier_type,
      admin_name,
      geom
    FROM boundaries.lower_tier
    UNION ALL
    SELECT
      COALESCE(NULLIF(TRIM(admin_id::TEXT), ''), upper_tier_id::TEXT) AS municipality_id,
      'upper_tier'::TEXT AS tier_type,
      admin_name,
      geom
    FROM boundaries.upper_tier
  )
`;

const isMissingRelationError = (error) => {
  const code = error?.original?.code || error?.parent?.code || error?.code;
  if (code === '42P01') return true;

  const message = String(
    error?.message || error?.original?.message || error?.parent?.message || ''
  ).toLowerCase();
  return message.includes('relation') && message.includes('does not exist');
};

const runMunicipalityLookup = async (sqlFactory, replacements = {}) => {
  try {
    const [rows] = await sequelize.query(sqlFactory(ALL_MUNICIPALITIES_RELATION), {
      replacements,
    });
    return rows?.[0] || null;
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    try {
      const [rows] = await sequelize.query(sqlFactory(MUNICIPALITY_FALLBACK_SOURCE), {
        replacements,
      });
      return rows?.[0] || null;
    } catch (fallbackError) {
      // If local boundaries tables are also unavailable, treat as unmapped instead of crashing.
      if (isMissingRelationError(fallbackError)) {
        return null;
      }
      throw fallbackError;
    }
  }
};

const rollbackIfNeeded = async (transaction) => {
  if (transaction && !transaction.finished) {
    await transaction.rollback();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Where-clause builder (returns { where } or throws a 400 error)
// ─────────────────────────────────────────────────────────────────────────────

const buildWorkflowWhereClause = (query = {}) => {
  const search = String(query.search || '').trim();
  const category = normalizeFilterString(query.category);
  const typeFilter = normalizeFilterString(query.type);
  const statusFilter = normalizeFilterString(query.status);
  const jurisdiction = String(query.jurisdiction || '').trim();

  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { project: { [Op.iLike]: `%${search}%` } },
      { jurisdiction: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (category === 'template') {
    where.is_template = true;
  } else if (category === 'general') {
    where.is_template = false;
  }

  if (typeFilter && typeFilter !== 'all') {
    if (!VALID_WORKFLOW_TYPES.includes(typeFilter)) {
      const err = new Error('Invalid workflow type filter');
      err.statusCode = 400;
      throw err;
    }
    where.type = typeFilter;
  }

  if (statusFilter && statusFilter !== 'all') {
    if (!VALID_WORKFLOW_STATUSES.includes(statusFilter)) {
      const err = new Error('Invalid workflow status filter');
      err.statusCode = 400;
      throw err;
    }
    where.status = statusFilter;
  }

  if (jurisdiction) {
    where.jurisdiction = jurisdiction;
  }

  return where;
};

// ─────────────────────────────────────────────────────────────────────────────
// Municipality resolution for map data
// ─────────────────────────────────────────────────────────────────────────────

const fetchMunicipalityById = async ({ municipalityId, tierType }) => {
  if (!municipalityId) return null;
  return runMunicipalityLookup(
    (source) => `
      SELECT
        municipality_id::TEXT AS "municipalityId",
        tier_type AS "tierType",
        admin_name AS "municipalityName",
        ST_Y(ST_Centroid(geom)) AS latitude,
        ST_X(ST_Centroid(geom)) AS longitude
      FROM ${source}
      WHERE municipality_id::TEXT = :municipalityId
        AND (:tierType::TEXT IS NULL OR tier_type = :tierType)
      ORDER BY
        CASE WHEN :tierType::TEXT IS NOT NULL AND tier_type = :tierType THEN 0 ELSE 1 END,
        CASE tier_type
          WHEN 'single_tier' THEN 1
          WHEN 'lower_tier' THEN 2
          WHEN 'upper_tier' THEN 3
          ELSE 4
        END
      LIMIT 1;
    `,
    {
      municipalityId: String(municipalityId).trim(),
      tierType: normalizeTierType(tierType),
    }
  );
};

const fetchMunicipalityByName = async (municipalityName) => {
  if (!municipalityName) return null;
  return runMunicipalityLookup(
    (source) => `
      SELECT
        municipality_id::TEXT AS "municipalityId",
        tier_type AS "tierType",
        admin_name AS "municipalityName",
        ST_Y(ST_Centroid(geom)) AS latitude,
        ST_X(ST_Centroid(geom)) AS longitude
      FROM ${source}
      WHERE LOWER(admin_name) = LOWER(:municipalityName)
      ORDER BY
        CASE tier_type
          WHEN 'single_tier' THEN 1
          WHEN 'lower_tier' THEN 2
          WHEN 'upper_tier' THEN 3
          ELSE 4
        END
      LIMIT 1;
    `,
    {
      municipalityName: String(municipalityName).trim(),
    }
  );
};

const mapLocationFromMunicipality = (row) => {
  if (!row) return null;
  const latitude = toFiniteNumberOrNull(row.latitude);
  const longitude = toFiniteNumberOrNull(row.longitude);
  if (latitude === null || longitude === null) return null;

  return {
    status: 'mapped',
    municipalityId: row.municipalityId || null,
    tierType: row.tierType || null,
    municipalityName: row.municipalityName || null,
    latitude,
    longitude,
    reason: null,
  };
};

const createUnmappedLocation = (workflow, reason) => ({
  status: 'unmapped',
  municipalityId: workflow?.jurisdiction_id || null,
  tierType: normalizeTierType(workflow?.jurisdiction_tier_type),
  municipalityName: workflow?.jurisdiction || null,
  latitude: null,
  longitude: null,
  reason,
});

const resolveWorkflowMapLocation = async (workflow, cache = {}) => {
  const municipalityId = String(workflow?.jurisdiction_id || '').trim();
  const tierType = normalizeTierType(workflow?.jurisdiction_tier_type);
  const municipalityName = String(workflow?.jurisdiction || '').trim();

  if (!municipalityId && !municipalityName) {
    return createUnmappedLocation(workflow, 'JURISDICTION_NOT_SET');
  }

  const byIdKey = municipalityId ? `${municipalityId}:${tierType || 'any'}` : null;
  if (byIdKey && cache.byId?.has(byIdKey)) {
    return cache.byId.get(byIdKey);
  }

  if (municipalityId) {
    const municipality = await fetchMunicipalityById({ municipalityId, tierType });
    const mapped = mapLocationFromMunicipality(municipality);
    if (mapped) {
      if (cache.byId) cache.byId.set(byIdKey, mapped);
      if (cache.byName && mapped.municipalityName) {
        cache.byName.set(mapped.municipalityName.toLowerCase(), mapped);
      }
      return mapped;
    }
  }

  const byNameKey = municipalityName ? municipalityName.toLowerCase() : null;
  if (byNameKey && cache.byName?.has(byNameKey)) {
    return cache.byName.get(byNameKey);
  }

  if (municipalityName) {
    const municipality = await fetchMunicipalityByName(municipalityName);
    const mapped = mapLocationFromMunicipality(municipality);
    if (mapped) {
      if (cache.byName) cache.byName.set(byNameKey, mapped);
      if (cache.byId && mapped.municipalityId) {
        cache.byId.set(`${mapped.municipalityId}:${mapped.tierType || 'any'}`, mapped);
      }
      return mapped;
    }
  }

  return createUnmappedLocation(workflow, 'MUNICIPALITY_NOT_FOUND');
};

const mapWorkflowRecordsWithLocation = async (rows = []) => {
  const cache = { byId: new Map(), byName: new Map() };
  const rawRows = rows.map((row) => (row?.toJSON ? row.toJSON() : row || {}));

  const locations = await Promise.all(
    rawRows.map((workflow) => resolveWorkflowMapLocation(workflow, cache))
  );

  return rawRows.map((workflow, index) =>
    mapWorkflowRecord({
      ...workflow,
      mapLocation: locations[index],
    })
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

const getWorkflowMetadata = async () => {
  const [
    stepLibraryRows,
    roleRows,
    projectRowsResult,
    starterStepRowsResult,
    transitionRowsResult,
    workflowCount,
    templateCount,
    activeCount,
    stepCount,
  ] = await Promise.all([
    sequelize.query(
      `
        SELECT
          name,
          MIN(step_type) AS "stepType",
          COUNT(*)::INT AS "usageCount"
        FROM workflow_steps
        WHERE name IS NOT NULL
          AND TRIM(name) <> ''
        GROUP BY name
        ORDER BY COUNT(*) DESC, name ASC;
      `
    ),
    sequelize.query(
      `
        SELECT DISTINCT TRIM(assignee_role) AS "assigneeRole"
        FROM workflow_steps
        WHERE assignee_role IS NOT NULL
          AND TRIM(assignee_role) <> ''
        ORDER BY "assigneeRole" ASC;
      `
    ),
    sequelize.query(
      `
        SELECT value
        FROM (
          SELECT TRIM(project)::TEXT AS value
          FROM workflows
          WHERE project IS NOT NULL
            AND TRIM(project) <> ''

          UNION ALL

          SELECT TRIM(project_name)::TEXT AS value
          FROM workflows
          CROSS JOIN LATERAL jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(applies_to) = 'array' THEN applies_to
              ELSE '[]'::jsonb
            END
          ) AS applies(project_name)
          WHERE TRIM(project_name) <> ''
        ) project_values
        WHERE value <> ''
        GROUP BY value
        ORDER BY COUNT(*) DESC, value ASC;
      `
    ),
    sequelize.query(
      `
        SELECT
          name,
          MIN(step_type) AS "stepType",
          COUNT(*)::INT AS "usageCount"
        FROM workflow_steps
        WHERE step_order = 1
          AND name IS NOT NULL
          AND TRIM(name) <> ''
        GROUP BY name
        ORDER BY COUNT(*) DESC, name ASC
        LIMIT 10;
      `
    ),
    sequelize.query(
      `
        SELECT
          first_step.name AS "fromStepName",
          next_step.name AS "toStepName",
          MIN(next_step.step_type) AS "toStepType",
          COUNT(*)::INT AS "usageCount"
        FROM workflow_steps first_step
        INNER JOIN workflow_steps next_step
          ON next_step.workflow_id = first_step.workflow_id
         AND next_step.step_order = first_step.step_order + 1
        WHERE first_step.name IS NOT NULL
          AND next_step.name IS NOT NULL
          AND TRIM(first_step.name) <> ''
          AND TRIM(next_step.name) <> ''
        GROUP BY first_step.name, next_step.name
        ORDER BY COUNT(*) DESC, first_step.name ASC, next_step.name ASC
        LIMIT 30;
      `
    ),
    Workflow.count(),
    Workflow.count({ where: { is_template: true } }),
    Workflow.count({ where: { status: 'active' } }),
    WorkflowStep.count(),
  ]);

  const [stepRows] = stepLibraryRows;
  const [assigneeRows] = roleRows;
  const [projectRows] = projectRowsResult;
  const [starterStepRows] = starterStepRowsResult;
  const [transitionRows] = transitionRowsResult;

  const stepLibrary = (stepRows || []).map((row) => ({
    id: String(row.name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
    name: row.name,
    label: row.name,
    stepType: row.stepType || 'review',
    usageCount: Number(row.usageCount) || 0,
  }));

  const assigneeRoleSuggestions = (assigneeRows || [])
    .map((row) => String(row.assigneeRole || '').trim())
    .filter(Boolean);

  const projectSuggestions = (projectRows || [])
    .map((row) => String(row.value || '').trim())
    .filter(Boolean);

  const starterSteps = (starterStepRows || []).map((row) => ({
    id: String(row.name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
    name: row.name,
    label: row.name,
    stepType: row.stepType || 'review',
    usageCount: Number(row.usageCount) || 0,
  }));

  const transitions = (transitionRows || []).map((row) => ({
    fromStepName: row.fromStepName,
    toStepName: row.toStepName,
    toStepType: row.toStepType || 'review',
    usageCount: Number(row.usageCount) || 0,
  }));

  return {
    stepLibrary,
    assigneeRoleSuggestions,
    projectSuggestions,
    aiSuggestions: {
      starterSteps,
      transitions,
    },
    stats: {
      workflows: Number(workflowCount) || 0,
      templates: Number(templateCount) || 0,
      active: Number(activeCount) || 0,
      steps: Number(stepCount) || 0,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Exported service methods
// ─────────────────────────────────────────────────────────────────────────────

exports.getAll = async ({ page, limit, ...query }) => {
  const where = buildWorkflowWhereClause(query); // throws 400 error on bad filter
  const offset = (page - 1) * limit;

  const { count, rows } = await Workflow.findAndCountAll({
    where,
    limit,
    offset,
    distinct: true,
    include: WORKFLOW_INCLUDE,
    order: WORKFLOW_ORDER,
  });

  const data = await mapWorkflowRecordsWithLocation(rows);

  return {
    data,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  };
};

exports.getMap = async ({ limit, ...query }) => {
  const where = buildWorkflowWhereClause(query); // throws 400 error on bad filter

  const rows = await Workflow.findAll({
    where,
    limit,
    include: WORKFLOW_INCLUDE,
    order: WORKFLOW_ORDER,
  });

  const workflows = await mapWorkflowRecordsWithLocation(rows);
  const mapped = workflows.filter((item) => item.mapLocation?.status === 'mapped');
  const unmapped = workflows.filter((item) => item.mapLocation?.status !== 'mapped');

  const byStatus = workflows.reduce((acc, item) => {
    const key = item.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    workflows,
    mapped,
    unmapped,
    stats: {
      total: workflows.length,
      mapped: mapped.length,
      unmapped: unmapped.length,
      byStatus,
    },
  };
};

exports.getMetadata = () => getWorkflowMetadata();

exports.getById = async (id) => {
  const workflow = await Workflow.findByPk(id, {
    include: WORKFLOW_INCLUDE,
    order: [[{ model: WorkflowStep, as: 'steps' }, 'step_order', 'ASC']],
  });

  if (!workflow) {
    const err = new Error('Workflow not found');
    err.statusCode = 404;
    throw err;
  }

  const [mapped] = await mapWorkflowRecordsWithLocation([workflow]);
  return mapped;
};

exports.create = async (payload, userId) => {
  const normalizedPayload = normalizeWorkflowPayload(payload); // throws plain Error if invalid

  const transaction = await sequelize.transaction();
  try {
    const workflow = await Workflow.create(
      {
        name: normalizedPayload.name,
        description: normalizedPayload.description,
        status: normalizedPayload.status,
        jurisdiction: normalizedPayload.jurisdiction,
        jurisdiction_id: normalizedPayload.jurisdiction_id,
        jurisdiction_tier_type: normalizedPayload.jurisdiction_tier_type,
        type: normalizedPayload.type,
        is_template: normalizedPayload.is_template,
        project: normalizedPayload.project,
        applies_to: normalizedPayload.applies_to,
        created_by: userId,
      },
      { transaction }
    );

    await WorkflowStep.bulkCreate(
      normalizedPayload.steps.map((step) => ({
        ...step,
        workflow_id: workflow.id,
      })),
      { transaction }
    );

    await transaction.commit();

    const created = await Workflow.findByPk(workflow.id, {
      include: WORKFLOW_INCLUDE,
      order: [[{ model: WorkflowStep, as: 'steps' }, 'step_order', 'ASC']],
    });

    const [mapped] = await mapWorkflowRecordsWithLocation([created]);
    return mapped;
  } catch (error) {
    await rollbackIfNeeded(transaction);
    throw error;
  }
};

exports.update = async (id, payload) => {
  const workflow = await Workflow.findByPk(id);
  if (!workflow) {
    const err = new Error('Workflow not found');
    err.statusCode = 404;
    throw err;
  }

  const normalizedPayload = normalizeWorkflowPayload(payload); // throws plain Error if invalid

  const transaction = await sequelize.transaction();
  try {
    await workflow.update(
      {
        name: normalizedPayload.name,
        description: normalizedPayload.description,
        status: normalizedPayload.status,
        jurisdiction: normalizedPayload.jurisdiction,
        jurisdiction_id: normalizedPayload.jurisdiction_id,
        jurisdiction_tier_type: normalizedPayload.jurisdiction_tier_type,
        type: normalizedPayload.type,
        is_template: normalizedPayload.is_template,
        project: normalizedPayload.project,
        applies_to: normalizedPayload.applies_to,
      },
      { transaction }
    );

    await WorkflowStep.destroy({
      where: { workflow_id: id },
      transaction,
    });

    await WorkflowStep.bulkCreate(
      normalizedPayload.steps.map((step) => ({
        ...step,
        workflow_id: id,
      })),
      { transaction }
    );

    await transaction.commit();

    const updated = await Workflow.findByPk(id, {
      include: WORKFLOW_INCLUDE,
      order: [[{ model: WorkflowStep, as: 'steps' }, 'step_order', 'ASC']],
    });

    const [mapped] = await mapWorkflowRecordsWithLocation([updated]);
    return mapped;
  } catch (error) {
    await rollbackIfNeeded(transaction);
    throw error;
  }
};

exports.delete = async (id) => {
  const workflow = await Workflow.findByPk(id);
  if (!workflow) {
    const err = new Error('Workflow not found');
    err.statusCode = 404;
    throw err;
  }

  const linkedLegislationCount = await Legislation.count({
    where: { workflow_id: id },
  });

  if (linkedLegislationCount > 0) {
    const err = new Error(
      'This workflow is linked to legislation records and cannot be deleted'
    );
    err.statusCode = 409;
    err.conflictType = 'workflow_linked_to_legislation';
    err.linkedCount = linkedLegislationCount;
    throw err;
  }

  const transaction = await sequelize.transaction();
  try {
    await WorkflowStep.destroy({
      where: { workflow_id: id },
      transaction,
    });
    await workflow.destroy({ transaction });
    await transaction.commit();
  } catch (error) {
    await rollbackIfNeeded(transaction);
    throw error;
  }
};
