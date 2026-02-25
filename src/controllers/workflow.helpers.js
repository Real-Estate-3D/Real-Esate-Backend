const { v4: uuidv4 } = require('uuid');

const VALID_WORKFLOW_TYPES = Object.freeze([
  'project-specific',
  'municipal',
  'template',
]);

const VALID_WORKFLOW_STATUSES = Object.freeze([
  'active',
  'inactive',
  'draft',
  'completed',
]);

const VALID_JURISDICTION_TIER_TYPES = Object.freeze([
  'upper_tier',
  'lower_tier',
  'single_tier',
]);

const VALID_STEP_TYPES = Object.freeze([
  'submission',
  'review',
  'approval',
  'notification',
  'inspection',
  'finalization',
]);

const toTrimmedString = (value, { allowNull = false } = {}) => {
  if (value === undefined || value === null) {
    return allowNull ? null : '';
  }

  const text = String(value).trim();
  if (!text && allowNull) return null;
  return text;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  return fallback;
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];

  const unique = new Set();
  value.forEach((item) => {
    const text = toTrimmedString(item, { allowNull: true });
    if (text) unique.add(text);
  });
  return Array.from(unique);
};

const normalizeJurisdictionTierType = (value) => {
  const tierType = toTrimmedString(value, { allowNull: true })?.toLowerCase() || null;
  if (!tierType) return null;
  if (!VALID_JURISDICTION_TIER_TYPES.includes(tierType)) {
    throw new Error('jurisdictionTierType is invalid');
  }
  return tierType;
};

const normalizeCoordinate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const inferStepType = (name = '') => {
  const label = String(name).toLowerCase();
  if (label.includes('submit')) return 'submission';
  if (label.includes('approve')) return 'approval';
  if (label.includes('inspection')) return 'inspection';
  if (label.includes('notify')) return 'notification';
  if (label.includes('final')) return 'finalization';
  return 'review';
};

const normalizeWorkflowType = ({ type, isTemplate, is_template }) => {
  const explicitType = toTrimmedString(type, { allowNull: true })?.toLowerCase() || null;
  const templateMode = toBoolean(
    isTemplate !== undefined ? isTemplate : is_template,
    false
  );

  if (templateMode) {
    return { type: 'template', isTemplate: true };
  }

  if (!explicitType) {
    return { type: 'project-specific', isTemplate: false };
  }

  if (!VALID_WORKFLOW_TYPES.includes(explicitType)) {
    throw new Error('Workflow type is invalid');
  }

  if (explicitType === 'template') {
    return { type: 'template', isTemplate: true };
  }

  return { type: explicitType, isTemplate: false };
};

const normalizeRequiredDocuments = (documents) => {
  if (documents === undefined || documents === null) return [];
  if (!Array.isArray(documents)) {
    throw new Error('requiredDocuments must be an array');
  }

  const seenNames = new Set();

  return documents.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`requiredDocuments[${index}] is invalid`);
    }

    const name = toTrimmedString(item.name, { allowNull: true });
    if (!name) {
      throw new Error(`requiredDocuments[${index}].name is required`);
    }
    const normalizedKey = name.toLowerCase();
    if (seenNames.has(normalizedKey)) {
      throw new Error(`requiredDocuments[${index}].name is duplicated`);
    }
    seenNames.add(normalizedKey);

    const id = toTrimmedString(item.id, { allowNull: true }) || `doc-${uuidv4()}`;
    return {
      id,
      name,
      mandatory: toBoolean(item.mandatory, false),
    };
  });
};

const normalizeRelatedLegislation = (laws) => {
  if (laws === undefined || laws === null) return [];
  if (!Array.isArray(laws)) {
    throw new Error('relatedLegislation must be an array');
  }

  const seenTitles = new Set();

  return laws.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`relatedLegislation[${index}] is invalid`);
    }

    const title = toTrimmedString(item.title, { allowNull: true });
    if (!title) {
      throw new Error(`relatedLegislation[${index}].title is required`);
    }
    const normalizedKey = title.toLowerCase();
    if (seenTitles.has(normalizedKey)) {
      throw new Error(`relatedLegislation[${index}].title is duplicated`);
    }
    seenTitles.add(normalizedKey);

    const id = toTrimmedString(item.id, { allowNull: true }) || `law-${uuidv4()}`;
    return {
      id,
      title,
    };
  });
};

const normalizeStepsPayload = (stepsInput) => {
  if (!Array.isArray(stepsInput) || stepsInput.length === 0) {
    throw new Error('At least one workflow step is required');
  }

  return stepsInput.map((step, index) => {
    if (!step || typeof step !== 'object') {
      throw new Error(`steps[${index}] is invalid`);
    }

    const name = toTrimmedString(step.name, { allowNull: true });
    if (!name) {
      throw new Error(`steps[${index}].name is required`);
    }

    const rawStepType = toTrimmedString(step.step_type ?? step.stepType, {
      allowNull: true,
    });
    const stepType = (rawStepType ? rawStepType.toLowerCase() : null) || inferStepType(name);
    if (!VALID_STEP_TYPES.includes(stepType)) {
      throw new Error(`steps[${index}].stepType is invalid`);
    }

    const requiredDocuments = normalizeRequiredDocuments(
      step.required_documents ?? step.requiredDocuments
    );

    const relatedLegislation = normalizeRelatedLegislation(
      step.related_legislation ?? step.relatedLegislation
    );

    return {
      name,
      description: toTrimmedString(step.description, { allowNull: true }),
      step_order: index + 1,
      step_type: stepType,
      required: toBoolean(step.required, true),
      assignee_role: toTrimmedString(step.assignee_role ?? step.assigneeRole, {
        allowNull: true,
      }),
      required_documents: requiredDocuments,
      related_legislation: relatedLegislation,
    };
  });
};

const normalizeWorkflowPayload = (payload = {}) => {
  const name = toTrimmedString(payload.name, { allowNull: true });
  if (!name) {
    throw new Error('Workflow name is required');
  }

  const steps = normalizeStepsPayload(payload.steps);
  const { type, isTemplate } = normalizeWorkflowType(payload);

  const status =
    toTrimmedString(payload.status, { allowNull: true })?.toLowerCase() || 'active';
  if (!VALID_WORKFLOW_STATUSES.includes(status)) {
    throw new Error('Workflow status is invalid');
  }

  const jurisdiction = toTrimmedString(
    payload.jurisdiction ?? payload.province,
    { allowNull: true }
  );
  const jurisdictionId = toTrimmedString(
    payload.jurisdictionId ?? payload.jurisdiction_id,
    { allowNull: true }
  );
  const jurisdictionTierType = normalizeJurisdictionTierType(
    payload.jurisdictionTierType ?? payload.jurisdiction_tier_type
  );

  const project = isTemplate
    ? null
    : toTrimmedString(payload.project, { allowNull: true });

  const appliesToInput = payload.applies_to ?? payload.appliesTo;
  const appliesTo = isTemplate
    ? []
    : normalizeStringArray(appliesToInput !== undefined ? appliesToInput : project ? [project] : []);

  return {
    name,
    description: toTrimmedString(payload.description, { allowNull: true }),
    status,
    jurisdiction,
    jurisdiction_id: jurisdictionId,
    jurisdiction_tier_type: jurisdictionTierType,
    type,
    is_template: isTemplate,
    project,
    applies_to: appliesTo,
    steps,
  };
};

const mapWorkflowStep = (step, index = 0) => {
  const rawStep = step?.toJSON ? step.toJSON() : step || {};
  const requiredDocuments = Array.isArray(rawStep.required_documents)
    ? rawStep.required_documents
    : [];
  const relatedLegislation = Array.isArray(rawStep.related_legislation)
    ? rawStep.related_legislation
    : [];

  return {
    id: rawStep.id,
    name: rawStep.name,
    description: rawStep.description || null,
    stepOrder: rawStep.step_order ?? index + 1,
    step_order: rawStep.step_order ?? index + 1,
    stepType: rawStep.step_type || 'review',
    step_type: rawStep.step_type || 'review',
    required: Boolean(rawStep.required),
    assigneeRole: rawStep.assignee_role || null,
    assignee_role: rawStep.assignee_role || null,
    requiredDocuments,
    required_documents: requiredDocuments,
    relatedLegislation,
    related_legislation: relatedLegislation,
  };
};

const mapWorkflowRecord = (workflow) => {
  const raw = workflow?.toJSON ? workflow.toJSON() : workflow || {};
  const steps = Array.isArray(raw.steps)
    ? [...raw.steps]
        .sort((a, b) => (a.step_order || 0) - (b.step_order || 0))
        .map(mapWorkflowStep)
    : [];

  const isTemplate = Boolean(raw.is_template || raw.type === 'template');
  const appliesTo = Array.isArray(raw.applies_to)
    ? raw.applies_to.filter((item) => toTrimmedString(item, { allowNull: true }))
    : [];

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || '',
    status: raw.status,
    type: raw.type || (isTemplate ? 'template' : 'project-specific'),
    isTemplate,
    is_template: isTemplate,
    appliesTo: appliesTo.length > 0 ? appliesTo : raw.project ? [raw.project] : [],
    applies_to: appliesTo.length > 0 ? appliesTo : raw.project ? [raw.project] : [],
    project: raw.project || '',
    province: raw.jurisdiction || '',
    jurisdiction: raw.jurisdiction || '',
    jurisdictionId: raw.jurisdiction_id || null,
    jurisdiction_id: raw.jurisdiction_id || null,
    jurisdictionTierType: raw.jurisdiction_tier_type || null,
    jurisdiction_tier_type: raw.jurisdiction_tier_type || null,
    mapLocation:
      raw.mapLocation && typeof raw.mapLocation === 'object'
        ? {
            status: raw.mapLocation.status || 'unmapped',
            municipalityId: raw.mapLocation.municipalityId || null,
            tierType: raw.mapLocation.tierType || null,
            municipalityName: raw.mapLocation.municipalityName || null,
            latitude: normalizeCoordinate(raw.mapLocation.latitude),
            longitude: normalizeCoordinate(raw.mapLocation.longitude),
            reason: raw.mapLocation.reason || null,
          }
        : null,
    stepCount: steps.length,
    steps,
    createdAt: raw.created_at || raw.createdAt || null,
    updatedAt: raw.updated_at || raw.updatedAt || null,
  };
};

module.exports = {
  VALID_WORKFLOW_STATUSES,
  VALID_WORKFLOW_TYPES,
  VALID_JURISDICTION_TIER_TYPES,
  VALID_STEP_TYPES,
  normalizeWorkflowPayload,
  mapWorkflowRecord,
};
