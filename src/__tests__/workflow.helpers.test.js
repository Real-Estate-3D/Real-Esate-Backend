const {
  mapWorkflowRecord,
  normalizeWorkflowPayload,
} = require('../controllers/workflow.helpers');

describe('workflow helpers', () => {
  test('normalizeWorkflowPayload creates template payload safely', () => {
    const payload = normalizeWorkflowPayload({
      name: 'Development Review Template',
      isTemplate: true,
      jurisdiction: 'Las Pinas Province',
      jurisdictionId: '123',
      jurisdictionTierType: 'single_tier',
      steps: [
        {
          name: 'Submit Application',
          required: true,
          assigneeRole: 'Planner',
          requiredDocuments: [{ name: 'General plan of the territory', mandatory: true }],
          relatedLegislation: [{ title: 'Law DCE-312' }],
        },
      ],
    });

    expect(payload.is_template).toBe(true);
    expect(payload.type).toBe('template');
    expect(payload.project).toBeNull();
    expect(payload.applies_to).toEqual([]);
    expect(payload.jurisdiction_id).toBe('123');
    expect(payload.jurisdiction_tier_type).toBe('single_tier');
    expect(payload.steps[0].required_documents[0].name).toBe('General plan of the territory');
    expect(payload.steps[0].related_legislation[0].title).toBe('Law DCE-312');
  });

  test('normalizeWorkflowPayload rejects invalid jurisdiction tier type', () => {
    expect(() =>
      normalizeWorkflowPayload({
        name: 'Workflow',
        jurisdictionTierType: 'district',
        steps: [{ name: 'Submit Application' }],
      })
    ).toThrow('jurisdictionTierType is invalid');
  });

  test('normalizeWorkflowPayload rejects invalid document entries', () => {
    expect(() =>
      normalizeWorkflowPayload({
        name: 'Workflow',
        type: 'project-specific',
        steps: [
          {
            name: 'Submit Application',
            requiredDocuments: [{ mandatory: true }],
          },
        ],
      })
    ).toThrow('requiredDocuments[0].name is required');
  });

  test('normalizeWorkflowPayload rejects duplicate legislation titles in a step', () => {
    expect(() =>
      normalizeWorkflowPayload({
        name: 'Workflow',
        type: 'project-specific',
        steps: [
          {
            name: 'Submit Application',
            relatedLegislation: [
              { title: 'Law DCE-312' },
              { title: 'law dce-312' },
            ],
          },
        ],
      })
    ).toThrow('relatedLegislation[1].title is duplicated');
  });

  test('mapWorkflowRecord maps DB fields to FE fields', () => {
    const workflow = mapWorkflowRecord({
      id: 'wf-1',
      name: 'Development Review',
      description: 'Workflow',
      type: 'project-specific',
      is_template: false,
      project: 'Project 13C298',
      applies_to: [],
      jurisdiction: 'Las Pinas Province',
      jurisdiction_id: '100',
      jurisdiction_tier_type: 'single_tier',
      status: 'active',
      mapLocation: {
        status: 'mapped',
        municipalityId: '100',
        tierType: 'single_tier',
        municipalityName: 'Las Pinas',
        latitude: '43.7001',
        longitude: '-79.4102',
      },
      steps: [
        {
          id: 'step-1',
          name: 'Submit Application',
          step_order: 1,
          step_type: 'submission',
          required: true,
          assignee_role: 'Planner',
          required_documents: [{ id: 'doc-1', name: 'Doc A', mandatory: true }],
          related_legislation: [{ id: 'law-1', title: 'Law DCE-312' }],
        },
      ],
      created_at: '2026-02-20T00:00:00.000Z',
      updated_at: '2026-02-20T00:00:00.000Z',
    });

    expect(workflow.appliesTo).toEqual(['Project 13C298']);
    expect(workflow.stepCount).toBe(1);
    expect(workflow.jurisdictionId).toBe('100');
    expect(workflow.jurisdictionTierType).toBe('single_tier');
    expect(workflow.mapLocation.latitude).toBeCloseTo(43.7001);
    expect(workflow.mapLocation.longitude).toBeCloseTo(-79.4102);
    expect(workflow.steps[0].requiredDocuments[0].name).toBe('Doc A');
    expect(workflow.steps[0].relatedLegislation[0].title).toBe('Law DCE-312');
  });

  test('mapWorkflowRecord preserves null coordinates for unmapped locations', () => {
    const workflow = mapWorkflowRecord({
      id: 'wf-unmapped',
      name: 'Unmapped Workflow',
      type: 'project-specific',
      is_template: false,
      status: 'draft',
      mapLocation: {
        status: 'unmapped',
        municipalityName: 'Unknown',
        latitude: null,
        longitude: null,
        reason: 'MUNICIPALITY_NOT_FOUND',
      },
      steps: [],
    });

    expect(workflow.mapLocation.status).toBe('unmapped');
    expect(workflow.mapLocation.latitude).toBeNull();
    expect(workflow.mapLocation.longitude).toBeNull();
    expect(workflow.mapLocation.reason).toBe('MUNICIPALITY_NOT_FOUND');
  });
});
