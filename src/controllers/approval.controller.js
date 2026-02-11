const asyncHandler = require('../middleware/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');

const reviewers = [
  { id: 'rv-001', name: 'John Doe', role: 'City Official' },
  { id: 'rv-002', name: 'Jane Smith', role: 'Urban Planner' },
  { id: 'rv-003', name: 'David Lee', role: 'GIS Specialist' },
  { id: 'rv-004', name: 'Sofia Davis', role: 'Policy Reviewer' },
];

const seedApprovals = [
  {
    id: 'app-001',
    name: 'Zoning By-Law Amendment',
    project: 'Downtown Revitalization',
    applicant: 'SkyHigh Developments Inc.',
    location: '123 Main Street',
    description:
      "You can't compress the program without quantifying the open-source SSL certificate.",
    status: 'pending_review',
    submittedDate: '2025-04-18',
    assignedReviewer: null,
  },
  {
    id: 'app-002',
    name: 'Site Plan Approval',
    project: 'Smart Park Initiative',
    applicant: 'GreenField Realty',
    location: '456 Oak Avenue',
    description: 'Ensure all green spaces are maintained.',
    status: 'pending_review',
    submittedDate: '2025-04-20',
    assignedReviewer: null,
  },
  {
    id: 'app-003',
    name: 'Building Permit',
    project: 'Renewable Energy Project',
    applicant: 'Urban Innovations',
    location: '789 Elm Street',
    description: 'Review structural integrity reports.',
    status: 'approved',
    submittedDate: '2025-04-14',
    assignedReviewer: { id: 'rv-002', name: 'Jane Smith' },
  },
  {
    id: 'app-004',
    name: 'Subdivision Application',
    project: 'Green Space Initiative',
    applicant: 'NextGen Homes',
    location: '321 Pine Lane',
    description: 'Address traffic impact studies.',
    status: 'revision_requested',
    submittedDate: '2025-04-08',
    assignedReviewer: { id: 'rv-003', name: 'David Lee' },
  },
  {
    id: 'app-005',
    name: 'Development Agreement',
    project: 'Smart Transit Solutions',
    applicant: 'Future Living Group',
    location: '555 Birch Road',
    description: 'Finalize utility layout plans.',
    status: 'pending_review',
    submittedDate: '2025-04-21',
    assignedReviewer: null,
  },
  {
    id: 'app-006',
    name: 'Design Collaboration',
    project: 'Historic Building Preservation',
    applicant: 'Green Space Architects',
    location: '45 Elm Avenue',
    description: 'Draft initial design concepts.',
    status: 'assigned',
    submittedDate: '2025-04-13',
    assignedReviewer: { id: 'rv-001', name: 'John Doe' },
  },
  {
    id: 'app-007',
    name: 'Construction Bid',
    project: 'Waste Reduction Program',
    applicant: 'BuildRight Contractors',
    location: '78 Pine Street',
    description: 'Review submitted bids.',
    status: 'rejected',
    submittedDate: '2025-04-03',
    assignedReviewer: { id: 'rv-002', name: 'Jane Smith' },
  },
  {
    id: 'app-008',
    name: 'Environmental Impact Study',
    project: 'Community Arts Festival',
    applicant: 'EcoAnalyze Group',
    location: '102 Maple Drive',
    description: 'Compile impact assessment report.',
    status: 'pending_review',
    submittedDate: '2025-04-17',
    assignedReviewer: null,
  },
  {
    id: 'app-009',
    name: 'Community Feedback Session',
    project: 'Affordable Housing Development',
    applicant: 'Local Council',
    location: '202 Oak Boulevard',
    description: 'Schedule public meeting.',
    status: 'pending_review',
    submittedDate: '2025-04-16',
    assignedReviewer: null,
  },
  {
    id: 'app-010',
    name: 'Budget Approval',
    project: 'Renewable Energy Project',
    applicant: 'Finance Department',
    location: '300 Cedar Lane',
    description: 'Finalize budget allocation.',
    status: 'pending_review',
    submittedDate: '2025-04-09',
    assignedReviewer: null,
  },
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();

const withDetails = (approval) => ({
  ...approval,
  zoningInfo: {
    currentZoning: 'R2 - Residential',
    proposedZoning: 'MU-Mixed Use',
    landArea: '4.8 hectares',
    officialPlanDesignation: 'Urban Growth Center',
    specialProvisions: 'Oak Ridges Moraine Conservation Plan',
    environmentalSensitivity: 'Medium',
  },
  legislationDetails: {
    legislation: 'Environmental Impact Assessment',
    label: 'Description',
    originalLegislation:
      'The contractor will not discriminate against employees or applicants for employment based on race, creed, color, national origin, sex, age, disability, or marital status.',
    amendment:
      'At the request of the contracting agency, the contractor shall request each employment agency or labor union to provide a written non-discrimination statement.',
  },
  sitePlan: {
    title: 'Site Plan',
    mapCenter: { lat: 43.6532, lng: -79.3832 },
    municipalBoundaries: [
      {
        id: 'boundary-1',
        name: 'Municipal Boundary',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-79.395, 43.645],
              [-79.355, 43.645],
              [-79.355, 43.667],
              [-79.395, 43.667],
              [-79.395, 43.645],
            ],
          ],
        },
      },
    ],
    gisSchedulePolygons: [
      {
        id: 'schedule-green',
        name: 'Compliant Zone',
        color: '#24bf7a',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-79.39, 43.65],
              [-79.36, 43.65],
              [-79.36, 43.664],
              [-79.39, 43.664],
              [-79.39, 43.65],
            ],
          ],
        },
      },
      {
        id: 'schedule-red',
        name: 'Violation Zone',
        color: '#d96b6b',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-79.368, 43.646],
              [-79.355, 43.646],
              [-79.355, 43.656],
              [-79.368, 43.656],
              [-79.368, 43.646],
            ],
          ],
        },
      },
    ],
  },
  legislativeCompliance: [
    {
      id: 'cmp-1',
      law: 'Greenbelt Act',
      requirement: '20m from water bodies',
      status: 'violate',
    },
    {
      id: 'cmp-2',
      law: 'Municipal Bylaw',
      requirement: 'Max 3 storeys',
      status: 'complies',
    },
  ],
  requiredStudies: [
    {
      id: 'study-1',
      name: 'Traffic Impact Study',
      owner: 'By: Jane Doe',
      status: 'complete',
    },
    {
      id: 'study-2',
      name: 'Environmental Impact Study',
      owner: 'Pending',
      status: 'pending',
    },
  ],
  workflow: [
    {
      id: 'wf-1',
      title: 'Submission Received',
      owner: 'By: System',
      status: 'completed',
      date: '18.04.2025',
    },
    {
      id: 'wf-2',
      title: 'Review by Planning Department',
      owner: 'By: John Doe',
      status: 'completed',
      date: '19.04.2025',
    },
    {
      id: 'wf-3',
      title: 'Approved',
      owner: 'By: Jane Smith',
      status: 'completed',
      date: '19.04.2025',
    },
    {
      id: 'wf-4',
      title: 'Consolidated',
      owner: 'Pending',
      status: 'pending',
      date: '',
    },
  ],
  documents: [
    { id: 'doc-1', name: 'Cost Plan.pdf', size: '800 KB' },
    { id: 'doc-2', name: 'Environment Assessment.pdf', size: '3 MB' },
    { id: 'doc-3', name: 'Document.pdf', size: '3 MB' },
  ],
  comments: [
    {
      id: 'cm-1',
      author: 'Sofia Davis',
      role: 'City Official',
      text: 'Use a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.',
      createdAt: '2025-10-04T12:40:00.000Z',
    },
  ],
  history: [],
  createdAt: approval.createdAt || nowIso(),
  updatedAt: approval.updatedAt || nowIso(),
});

let approvals = seedApprovals.map(withDetails);

const findApproval = (id) => approvals.find((item) => item.id === id);

const persistApproval = (updatedApproval) => {
  approvals = approvals.map((item) =>
    item.id === updatedApproval.id ? updatedApproval : item
  );
  return updatedApproval;
};

const filterApprovals = (items, query) => {
  const search = (query.search || '').trim().toLowerCase();
  const status = query.status || 'all';

  return items.filter((item) => {
    const matchesStatus = status === 'all' ? true : item.status === status;
    if (!matchesStatus) return false;

    if (!search) return true;
    const haystack = `${item.name} ${item.project} ${item.applicant} ${item.location} ${item.description}`.toLowerCase();
    return haystack.includes(search);
  });
};

exports.getReviewers = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: reviewers,
  });
});

exports.getAll = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.max(parseInt(req.query.limit || '10', 10), 1);

  const filtered = filterApprovals(approvals, req.query);
  const start = (page - 1) * limit;
  const rows = filtered.slice(start, start + limit);

  res.json({
    success: true,
    data: rows.map((item) => ({
      id: item.id,
      name: item.name,
      project: item.project,
      applicant: item.applicant,
      location: item.location,
      description: item.description,
      status: item.status,
      submittedDate: item.submittedDate,
      assignedReviewer: item.assignedReviewer,
      updatedAt: item.updatedAt,
    })),
    pagination: {
      total: filtered.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const approval = findApproval(req.params.id);
  if (!approval) {
    throw new ApiError(404, 'Approval not found');
  }

  res.json({
    success: true,
    data: approval,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const {
    name,
    project,
    applicant,
    location,
    description,
    submittedDate,
  } = req.body;

  if (!name || !project || !applicant) {
    throw new ApiError(400, 'name, project, and applicant are required');
  }

  const created = withDetails({
    id: `app-${Date.now()}`,
    name,
    project,
    applicant,
    location: location || 'N/A',
    description: description || 'No description provided.',
    status: 'pending_review',
    submittedDate: submittedDate || nowIso().slice(0, 10),
    assignedReviewer: null,
    comments: [],
    history: [
      {
        id: `hist-${Date.now()}`,
        action: 'created',
        actor: req.user?.firstName || req.user?.name || 'System',
        note: 'Approval created',
        date: nowIso(),
      },
    ],
  });

  approvals = [created, ...approvals];

  res.status(201).json({
    success: true,
    message: 'Approval created successfully',
    data: created,
  });
});

exports.approve = asyncHandler(async (req, res) => {
  const approval = findApproval(req.params.id);
  if (!approval) {
    throw new ApiError(404, 'Approval not found');
  }

  const updated = persistApproval({
    ...approval,
    status: 'approved',
    updatedAt: nowIso(),
    history: [
      ...(approval.history || []),
      {
        id: `hist-${Date.now()}`,
        action: 'approved',
        actor: req.user?.firstName || req.user?.name || 'System',
        note: req.body?.reason || 'Application approved',
        date: nowIso(),
      },
    ],
  });

  res.json({
    success: true,
    message: 'Approval updated successfully',
    data: updated,
  });
});

exports.reject = asyncHandler(async (req, res) => {
  const approval = findApproval(req.params.id);
  if (!approval) {
    throw new ApiError(404, 'Approval not found');
  }

  const updated = persistApproval({
    ...approval,
    status: 'rejected',
    updatedAt: nowIso(),
    history: [
      ...(approval.history || []),
      {
        id: `hist-${Date.now()}`,
        action: 'rejected',
        actor: req.user?.firstName || req.user?.name || 'System',
        note: req.body?.reason || 'Application rejected',
        date: nowIso(),
      },
    ],
  });

  res.json({
    success: true,
    message: 'Approval rejected',
    data: updated,
  });
});

exports.assign = asyncHandler(async (req, res) => {
  const approval = findApproval(req.params.id);
  if (!approval) {
    throw new ApiError(404, 'Approval not found');
  }

  const reviewer =
    req.body?.reviewer ||
    reviewers.find((item) => item.id === req.body?.reviewerId) ||
    null;

  if (!reviewer) {
    throw new ApiError(400, 'reviewer or reviewerId is required');
  }

  const updated = persistApproval({
    ...approval,
    status: 'assigned',
    assignedReviewer: reviewer,
    updatedAt: nowIso(),
    history: [
      ...(approval.history || []),
      {
        id: `hist-${Date.now()}`,
        action: 'assigned',
        actor: req.user?.firstName || req.user?.name || 'System',
        note: `Assigned to ${reviewer.name}`,
        date: nowIso(),
      },
    ],
  });

  res.json({
    success: true,
    message: 'Approval assigned successfully',
    data: updated,
  });
});

exports.requestRevision = asyncHandler(async (req, res) => {
  const approval = findApproval(req.params.id);
  if (!approval) {
    throw new ApiError(404, 'Approval not found');
  }

  const updated = persistApproval({
    ...approval,
    status: 'revision_requested',
    updatedAt: nowIso(),
    history: [
      ...(approval.history || []),
      {
        id: `hist-${Date.now()}`,
        action: 'revision_requested',
        actor: req.user?.firstName || req.user?.name || 'System',
        note: req.body?.reason || 'Revision requested',
        date: nowIso(),
      },
    ],
  });

  res.json({
    success: true,
    message: 'Revision requested',
    data: updated,
  });
});

exports.addComment = asyncHandler(async (req, res) => {
  const approval = findApproval(req.params.id);
  if (!approval) {
    throw new ApiError(404, 'Approval not found');
  }

  const text = req.body?.text?.trim();
  if (!text) {
    throw new ApiError(400, 'Comment text is required');
  }

  const newComment = {
    id: `cm-${Date.now()}`,
    author:
      req.body?.author ||
      req.user?.display_name ||
      req.user?.firstName ||
      req.user?.name ||
      'System',
    role: req.body?.role || 'Reviewer',
    text,
    createdAt: nowIso(),
  };

  const updated = persistApproval({
    ...approval,
    comments: [...(approval.comments || []), newComment],
    updatedAt: nowIso(),
  });

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: updated,
  });
});

exports._resetApprovals = () => {
  approvals = clone(seedApprovals.map(withDetails));
};
