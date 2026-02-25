jest.mock('../models', () => ({
  Legislation: {
    count: jest.fn(),
  },
  Workflow: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  WorkflowStep: {
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
    query: jest.fn(),
  },
}));

const { Legislation, Workflow, WorkflowStep, sequelize } = require('../models');
const workflowController = require('../controllers/workflow.controller');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('workflow controller', () => {
  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.query.mockResolvedValue([[]]);
    Workflow.count.mockResolvedValue(0);
    WorkflowStep.count.mockResolvedValue(0);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  test('create persists workflow with jurisdiction references and step metadata', async () => {
    const transaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      finished: undefined,
    };

    sequelize.transaction.mockResolvedValue(transaction);
    Workflow.create.mockResolvedValue({ id: 'workflow-1' });
    WorkflowStep.bulkCreate.mockResolvedValue([]);
    Workflow.findByPk.mockResolvedValue({
      toJSON: () => ({
        id: 'workflow-1',
        name: 'Development Review',
        type: 'project-specific',
        is_template: false,
        project: 'Project 13C298',
        applies_to: ['Project 13C298'],
        jurisdiction: 'Toronto',
        jurisdiction_id: '3520005',
        jurisdiction_tier_type: 'single_tier',
        status: 'active',
        steps: [
          {
            id: 'step-1',
            name: 'Submit Application',
            step_order: 1,
            step_type: 'submission',
            required: true,
            assignee_role: 'Planner',
            required_documents: [
              { id: 'doc-1', name: 'General Plan Of The Territory', mandatory: true },
            ],
            related_legislation: [{ id: 'law-1', title: 'Law DCE-312' }],
          },
        ],
      }),
    });
    sequelize.query.mockResolvedValueOnce([
      [
        {
          municipalityId: '3520005',
          tierType: 'single_tier',
          municipalityName: 'Toronto',
          latitude: 43.6532,
          longitude: -79.3832,
        },
      ],
    ]);

    const req = {
      user: { id: 10 },
      body: {
        name: 'Development Review',
        type: 'project-specific',
        jurisdiction: 'Toronto',
        jurisdictionId: '3520005',
        jurisdictionTierType: 'single_tier',
        project: 'Project 13C298',
        steps: [
          {
            name: 'Submit Application',
            step_type: 'submission',
            required: true,
            assignee_role: 'Planner',
            requiredDocuments: [
              { name: 'General Plan Of The Territory', mandatory: true },
            ],
            relatedLegislation: [{ title: 'Law DCE-312' }],
          },
        ],
      },
    };
    const res = createRes();

    await workflowController.create(req, res);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(Workflow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Development Review',
        type: 'project-specific',
        is_template: false,
        jurisdiction: 'Toronto',
        jurisdiction_id: '3520005',
        jurisdiction_tier_type: 'single_tier',
        created_by: 10,
      }),
      expect.objectContaining({ transaction })
    );
    expect(WorkflowStep.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Submit Application',
          step_order: 1,
          step_type: 'submission',
          workflow_id: 'workflow-1',
          required_documents: expect.arrayContaining([
            expect.objectContaining({
              name: 'General Plan Of The Territory',
              mandatory: true,
            }),
          ]),
          related_legislation: expect.arrayContaining([
            expect.objectContaining({ title: 'Law DCE-312' }),
          ]),
        }),
      ]),
      expect.objectContaining({ transaction })
    );
    expect(transaction.commit).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Workflow created successfully',
      })
    );
  });

  test('update replaces steps and normalizes sequential step order', async () => {
    const transaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      finished: undefined,
    };
    const workflowRecord = {
      id: 'workflow-1',
      update: jest.fn().mockResolvedValue(undefined),
    };

    sequelize.transaction.mockResolvedValue(transaction);
    Workflow.findByPk
      .mockResolvedValueOnce(workflowRecord)
      .mockResolvedValueOnce({
        toJSON: () => ({
          id: 'workflow-1',
          name: 'Updated Workflow',
          type: 'project-specific',
          is_template: false,
          status: 'active',
          steps: [
            {
              id: 'step-a',
              name: 'Review By Planner',
              step_order: 1,
              step_type: 'review',
              required_documents: [],
              related_legislation: [],
            },
            {
              id: 'step-b',
              name: 'Approve By Council',
              step_order: 2,
              step_type: 'approval',
              required_documents: [],
              related_legislation: [],
            },
          ],
        }),
      });

    const req = {
      params: { id: 'workflow-1' },
      body: {
        name: 'Updated Workflow',
        type: 'project-specific',
        steps: [
          {
            name: 'Review By Planner',
            step_order: 99,
            step_type: 'review',
            requiredDocuments: [],
            relatedLegislation: [],
          },
          {
            name: 'Approve By Council',
            step_order: 77,
            step_type: 'approval',
            requiredDocuments: [],
            relatedLegislation: [],
          },
        ],
      },
    };
    const res = createRes();

    await workflowController.update(req, res);

    expect(workflowRecord.update).toHaveBeenCalledTimes(1);
    expect(WorkflowStep.destroy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workflow_id: 'workflow-1' },
        transaction,
      })
    );

    const bulkInsertRows = WorkflowStep.bulkCreate.mock.calls[0][0];
    expect(bulkInsertRows).toHaveLength(2);
    expect(bulkInsertRows[0]).toEqual(
      expect.objectContaining({
        name: 'Review By Planner',
        step_order: 1,
        workflow_id: 'workflow-1',
      })
    );
    expect(bulkInsertRows[1]).toEqual(
      expect.objectContaining({
        name: 'Approve By Council',
        step_order: 2,
        workflow_id: 'workflow-1',
      })
    );
    expect(transaction.commit).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Workflow updated successfully',
      })
    );
  });

  test('getAll applies category and type filters for general and template tabs', async () => {
    Workflow.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    const resGeneral = createRes();
    await workflowController.getAll(
      { query: { category: 'general', type: 'municipal', page: '1', limit: '10' } },
      resGeneral
    );

    expect(Workflow.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          is_template: false,
          type: 'municipal',
        }),
      })
    );

    Workflow.findAndCountAll.mockClear();
    Workflow.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    const resTemplate = createRes();
    await workflowController.getAll(
      { query: { category: 'template', type: 'template', page: '1', limit: '10' } },
      resTemplate
    );

    expect(Workflow.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          is_template: true,
          type: 'template',
        }),
      })
    );
  });

  test('getAll falls back when boundaries.all_municipalities is unavailable', async () => {
    Workflow.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          toJSON: () => ({
            id: 'wf-fallback',
            name: 'Fallback Workflow',
            type: 'project-specific',
            is_template: false,
            status: 'active',
            jurisdiction: 'Toronto',
            steps: [],
          }),
        },
      ],
    });

    sequelize.query
      .mockRejectedValueOnce({
        message: 'relation "boundaries.all_municipalities" does not exist',
        original: { code: '42P01' },
      })
      .mockResolvedValueOnce([[]]);

    const res = createRes();
    await workflowController.getAll({ query: { page: '1', limit: '10' } }, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'wf-fallback',
            mapLocation: expect.objectContaining({
              status: 'unmapped',
            }),
          }),
        ]),
      })
    );
  });

  test('getMap returns mapped and unmapped workflows with stats', async () => {
    Workflow.findAll.mockResolvedValue([
      {
        toJSON: () => ({
          id: 'wf-1',
          name: 'Mapped',
          status: 'active',
          jurisdiction: 'Toronto',
          jurisdiction_id: '100',
          jurisdiction_tier_type: 'single_tier',
          steps: [],
        }),
      },
      {
        toJSON: () => ({
          id: 'wf-2',
          name: 'Unmapped',
          status: 'draft',
          jurisdiction: 'Missing City',
          steps: [],
        }),
      },
    ]);
    sequelize.query
      .mockResolvedValueOnce([
        [
          {
            municipalityId: '100',
            tierType: 'single_tier',
            municipalityName: 'Toronto',
            latitude: 43.7,
            longitude: -79.4,
          },
        ],
      ])
      .mockResolvedValueOnce([[]]);

    const res = createRes();
    await workflowController.getMap({ query: {} }, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          workflows: expect.any(Array),
          mapped: expect.arrayContaining([
            expect.objectContaining({
              id: 'wf-1',
              mapLocation: expect.objectContaining({ status: 'mapped' }),
            }),
          ]),
          unmapped: expect.arrayContaining([
            expect.objectContaining({
              id: 'wf-2',
              mapLocation: expect.objectContaining({ status: 'unmapped' }),
            }),
          ]),
          stats: expect.objectContaining({
            total: 2,
            mapped: 1,
            unmapped: 1,
          }),
        }),
      })
    );
  });

  test('getMetadata aggregates step library and role suggestions', async () => {
    sequelize.query
      .mockResolvedValueOnce([
        [
          { name: 'Submit Application', stepType: 'submission', usageCount: 4 },
          { name: 'Review By Planner', stepType: 'review', usageCount: 2 },
        ],
      ])
      .mockResolvedValueOnce([
        [{ assigneeRole: 'GIS Analyst' }, { assigneeRole: 'Planner' }],
      ])
      .mockResolvedValueOnce([
        [{ value: 'Project Atlas' }, { value: 'Project Beacon' }],
      ])
      .mockResolvedValueOnce([
        [{ name: 'Submit Application', stepType: 'submission', usageCount: 3 }],
      ])
      .mockResolvedValueOnce([
        [
          {
            fromStepName: 'Submit Application',
            toStepName: 'Review By Planner',
            toStepType: 'review',
            usageCount: 2,
          },
        ],
      ]);
    Workflow.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);
    WorkflowStep.count.mockResolvedValueOnce(16);

    const res = createRes();
    await workflowController.getMetadata({}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          stepLibrary: expect.arrayContaining([
            expect.objectContaining({
              name: 'Submit Application',
              stepType: 'submission',
              usageCount: 4,
            }),
          ]),
          assigneeRoleSuggestions: ['GIS Analyst', 'Planner'],
          projectSuggestions: ['Project Atlas', 'Project Beacon'],
          aiSuggestions: expect.objectContaining({
            starterSteps: expect.arrayContaining([
              expect.objectContaining({
                name: 'Submit Application',
                stepType: 'submission',
                usageCount: 3,
              }),
            ]),
            transitions: expect.arrayContaining([
              expect.objectContaining({
                fromStepName: 'Submit Application',
                toStepName: 'Review By Planner',
                toStepType: 'review',
                usageCount: 2,
              }),
            ]),
          }),
          stats: expect.objectContaining({
            workflows: 7,
            templates: 2,
            active: 5,
            steps: 16,
          }),
        }),
      })
    );
  });

  test('getMetadata returns empty project and AI suggestions when no rows exist', async () => {
    sequelize.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);
    Workflow.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    WorkflowStep.count.mockResolvedValueOnce(0);

    const res = createRes();
    await workflowController.getMetadata({}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          projectSuggestions: [],
          aiSuggestions: {
            starterSteps: [],
            transitions: [],
          },
        }),
      })
    );
  });

  test('delete returns 409 when workflow is linked to legislation', async () => {
    Workflow.findByPk.mockResolvedValue({
      id: 'workflow-1',
      destroy: jest.fn(),
    });
    Legislation.count.mockResolvedValue(2);

    const res = createRes();
    await workflowController.delete({ params: { id: 'workflow-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        conflictType: 'workflow_linked_to_legislation',
        linkedCount: 2,
      })
    );
    expect(WorkflowStep.destroy).not.toHaveBeenCalled();
  });

  test('create returns 400 when step metadata has blank document name', async () => {
    const req = {
      body: {
        name: 'Development Review',
        type: 'project-specific',
        steps: [
          {
            name: 'Submit Application',
            requiredDocuments: [{ name: '   ', mandatory: true }],
            relatedLegislation: [],
          },
        ],
      },
    };
    const res = createRes();

    await workflowController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('requiredDocuments[0].name is required'),
      })
    );
    expect(Workflow.create).not.toHaveBeenCalled();
  });
});
