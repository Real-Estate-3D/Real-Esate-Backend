# Approvals API Contract

**Base URL:** `/api/v1/approvals`
**Auth:** `Authorization: Bearer <token>` required on all endpoints.
In `development` environment auth is bypassed automatically.
**Content-Type:** `application/json`

---

## Status Values

| Value                | Label             | Color  |
|----------------------|-------------------|--------|
| `pending_review`     | Pending Review    | Amber  |
| `assigned`           | Assigned          | Blue   |
| `approved`           | Approved          | Green  |
| `rejected`           | Rejected          | Red    |
| `revision_requested` | Revision Requested| Orange |

---

## Endpoints

### 1. GET `/api/v1/approvals` — List Approvals

Returns a paginated list. Each item is a slim record without JSONB detail blobs.

#### Query Parameters

| Param    | Type   | Default | Description |
|----------|--------|---------|-------------|
| `page`   | number | `1`     | Page number |
| `limit`  | number | `10`    | Records per page |
| `search` | string | —       | Searches across `name`, `project`, `applicant`, `location`, `description` |
| `status` | string | `all`   | Filter by status value. Pass `all` or omit to return every status |

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Zoning By-Law Amendment",
      "project": "Downtown Revitalization",
      "applicant": "SkyHigh Developments Inc.",
      "location": "123 Main Street",
      "description": "Short description.",
      "status": "pending_review",
      "submittedDate": "2025-04-18T00:00:00.000Z",
      "assignedReviewer": null,
      "updatedAt": "2026-02-25T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 2. POST `/api/v1/approvals` — Create Approval

Creates a new approval. Status is automatically set to `pending_review`. A `created` entry is written to approval history.

#### Request Body

| Field             | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| `name`            | string | **Yes**  | Title of the approval |
| `applicant`       | string | **Yes**  | Applicant name or company |
| `project`         | string | No       | Project name |
| `location`        | string | No       | Address or location |
| `description`     | string | No       | Free text |
| `submittedDate`   | string | No       | `YYYY-MM-DD`. Defaults to today |
| `zoningInfo`      | object | No       | Zoning details (see shape below) |
| `requiredStudies` | array  | No       | List of required study objects |
| `documents`       | array  | No       | List of uploaded document objects |

**`zoningInfo` shape**
```json
{
  "currentZoning": "R2 - Residential",
  "zoningStatus": "Active",
  "officialPlanDesignation": "Urban Growth Center",
  "specialProvisions": "Oak Ridges Moraine",
  "environmentalSensitivity": "Medium",
  "landArea": "4.8 hectares"
}
```

**`requiredStudies` item shape**
```json
{ "id": "study-1", "name": "Traffic Impact Study", "owner": "Pending", "status": "pending" }
```

**`documents` item shape**
```json
{ "id": "doc-1", "name": "Site Plan.pdf", "size": "2 MB" }
```

#### Example Request Body
```json
{
  "name": "Site Plan Approval",
  "applicant": "GreenField Realty",
  "project": "Smart Park Initiative",
  "location": "456 Oak Avenue",
  "description": "Ensure all green spaces are maintained.",
  "submittedDate": "2026-02-25",
  "zoningInfo": {
    "currentZoning": "R2 - Residential",
    "zoningStatus": "Active",
    "officialPlanDesignation": "Urban Growth Center",
    "specialProvisions": "",
    "environmentalSensitivity": "Low",
    "landArea": "3.2 hectares"
  },
  "requiredStudies": [
    { "id": "study-1", "name": "Environmental Impact Study", "owner": "Pending", "status": "pending" }
  ],
  "documents": [
    { "id": "doc-1", "name": "Site Plan.pdf", "size": "2 MB" }
  ]
}
```

#### Response `201`

Returns the full approval object (same shape as `GET /:id`). See **Full Approval Object** section below.

#### Error `400`
```json
{ "success": false, "message": "name and applicant are required" }
```

---

### 3. GET `/api/v1/approvals/:id` — Get Approval Detail

Returns the full approval including zoning info, comments, history, and all JSONB detail fields.

#### Response `200`

Returns the **Full Approval Object** (see section below).

#### Error `404`
```json
{ "success": false, "message": "Approval not found" }
```

---

### 4. PATCH `/api/v1/approvals/:id/approve` — Approve

Sets status to `approved`. Writes an `approved` history entry.

#### Request Body

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| `reason` | string | No       | Approval note. Defaults to `"Application approved"` |

```json
{ "reason": "Approved" }
```

#### Response `200`

Returns the **Full Approval Object** with `status: "approved"`.

---

### 5. PATCH `/api/v1/approvals/:id/reject` — Reject

Sets status to `rejected`. Writes a `rejected` history entry.

#### Request Body

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| `reason` | string | **Yes**  | Rejection reason (required by validation) |

```json
{ "reason": "Insufficient documentation provided." }
```

#### Response `200`

Returns the **Full Approval Object** with `status: "rejected"`.

#### Error `400`
```json
{ "success": false, "message": "reason is required to reject an approval" }
```

---

### 6. PATCH `/api/v1/approvals/:id/assign` — Assign to Reviewer

Sets status to `assigned`, stores the reviewer snapshot. Writes an `assigned` history entry.

#### Request Body — Option A: pass full reviewer object

```json
{
  "reviewer": {
    "id": "rv-002",
    "name": "Jane Smith",
    "role": "Urban Planner",
    "email": "jane.smith@blueprint.gov"
  }
}
```

#### Request Body — Option B: pass reviewerId to look up

```json
{ "reviewerId": "rv-002" }
```

#### Response `200`

Returns the **Full Approval Object** with `status: "assigned"` and `assignedReviewer` populated.

```json
{
  "success": true,
  "message": "Approval assigned to Jane Smith",
  "data": {
    "status": "assigned",
    "assignedReviewer": {
      "id": "rv-002",
      "name": "Jane Smith",
      "role": "Urban Planner",
      "email": "jane.smith@blueprint.gov"
    }
  }
}
```

#### Error `400`
```json
{ "success": false, "message": "reviewer or reviewerId is required" }
```

---

### 7. PATCH `/api/v1/approvals/:id/request-revision` — Request Revision

Sets status to `revision_requested`. Writes a `revision_requested` history entry with reason, deadline, and recipient composed into a single note.

#### Request Body

| Field       | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `reason`    | string | **Yes**  | Revision requirements |
| `deadline`  | string | No       | Deadline date or text |
| `recipient` | object | No       | Who should action the revision |

```json
{
  "reason": "Please provide updated traffic impact study.",
  "deadline": "2026-03-15",
  "recipient": {
    "id": "rv-003",
    "name": "David Lee",
    "role": "GIS Specialist",
    "email": "david.lee@blueprint.gov"
  }
}
```

#### Response `200`

Returns the **Full Approval Object** with `status: "revision_requested"`.

#### Error `400`
```json
{ "success": false, "message": "reason is required to request a revision" }
```

---

### 8. POST `/api/v1/approvals/:id/comments` — Add Comment

Adds a comment to the approval. Returns the full approval so the FE can refresh the entire comments list at once.

#### Request Body

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| `text`   | string | **Yes**  | Comment body |
| `author` | string | No       | Display name. Falls back to authenticated user |
| `role`   | string | No       | Role label. Defaults to `"Reviewer"` |

```json
{
  "text": "Please clarify the boundary on the north side.",
  "author": "Current User",
  "role": "City Official"
}
```

#### Response `201`

Returns the **Full Approval Object** with the new comment appended to `comments`.

#### Error `400`
```json
{ "success": false, "message": "Comment text is required" }
```

---

### 9. GET `/api/v1/approvals/meta/reviewers` — List Reviewers

Returns available reviewers for the assign and request-revision modals.

#### Response `200`

```json
{
  "success": true,
  "data": [
    { "id": "rv-001", "name": "John Doe",    "role": "City Official",   "email": "john.doe@blueprint.gov" },
    { "id": "rv-002", "name": "Jane Smith",  "role": "Urban Planner",   "email": "jane.smith@blueprint.gov" },
    { "id": "rv-003", "name": "David Lee",   "role": "GIS Specialist",  "email": "david.lee@blueprint.gov" },
    { "id": "rv-004", "name": "Sofia Davis", "role": "Policy Reviewer", "email": "sofia.davis@blueprint.gov" }
  ]
}
```

---

### 10. POST `/api/v1/approvals/meta/reviewers` — Add Reviewer

Adds a new reviewer to the pool.

#### Request Body

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `name`  | string | **Yes**  | Reviewer full name |
| `email` | string | **Yes**  | Must be a valid, unique email |
| `role`  | string | No       | Defaults to `"City Official"` |

```json
{
  "name": "Alex Johnson",
  "email": "alex.johnson@blueprint.gov",
  "role": "Urban Planner"
}
```

#### Response `201`

```json
{
  "success": true,
  "message": "Reviewer added successfully",
  "data": { "id": "rv-1740000000000", "name": "Alex Johnson", "role": "Urban Planner", "email": "alex.johnson@blueprint.gov" }
}
```

#### Errors
```json
{ "success": false, "message": "name and email are required" }
{ "success": false, "message": "A valid email is required" }
{ "success": false, "message": "A reviewer with this email already exists" }
```

---

## Full Approval Object

Returned by `GET /:id`, `POST /`, and all action endpoints (`approve`, `reject`, `assign`, `request-revision`, `comments`).

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Zoning By-Law Amendment",
  "project": "Downtown Revitalization",
  "applicant": "SkyHigh Developments Inc.",
  "location": "123 Main Street",
  "description": "Description text.",
  "status": "pending_review",
  "submittedDate": "2025-04-18T00:00:00.000Z",
  "assignedReviewer": null,

  "zoningInfo": {
    "currentZoning": "R2 - Residential",
    "zoningStatus": "Active",
    "officialPlanDesignation": "Urban Growth Center",
    "specialProvisions": "Oak Ridges Moraine",
    "environmentalSensitivity": "Medium",
    "landArea": "4.8 hectares"
  },

  "legislationDetails": {},

  "sitePlan": {},

  "legislativeCompliance": [
    { "id": "cmp-1", "law": "Greenbelt Act", "requirement": "20m from water bodies", "status": "violate" },
    { "id": "cmp-2", "law": "Municipal Bylaw", "requirement": "Max 3 storeys", "status": "complies" }
  ],

  "requiredStudies": [
    { "id": "study-1", "name": "Traffic Impact Study", "owner": "Pending", "status": "pending" }
  ],

  "workflow": [
    { "id": "wf-1", "title": "Submission Received", "owner": "By: System", "status": "completed", "date": "25.02.2026" }
  ],

  "documents": [
    { "id": "doc-1", "name": "Cost Plan.pdf", "size": "800 KB" }
  ],

  "comments": [
    {
      "id": "uuid",
      "author": "Sofia Davis",
      "role": "City Official",
      "text": "Please clarify the boundary on the north side.",
      "createdAt": "2026-02-25T10:40:00.000Z"
    }
  ],

  "history": [
    {
      "id": "uuid",
      "action": "created",
      "actorName": "System",
      "note": "Approval submitted",
      "createdAt": "2026-02-25T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "action": "assigned",
      "actorName": "Admin",
      "note": "Assigned to Jane Smith (Urban Planner)",
      "createdAt": "2026-02-25T11:00:00.000Z"
    }
  ],

  "createdAt": "2026-02-25T10:00:00.000Z",
  "updatedAt": "2026-02-25T11:00:00.000Z"
}
```

---

## Database Tables

| Table               | Schema | Purpose |
|---------------------|--------|---------|
| `approvals`         | public | Main record — all core fields + JSONB blobs |
| `approval_comments` | public | Individual comments, one-to-many with approvals |
| `approval_history`  | public | Immutable audit trail — one row per action, no `updated_at` |

## Notes for FE Integration

- **All dates** are returned as ISO 8601 strings (e.g. `"2026-02-25T10:00:00.000Z"`).
- **`assignedReviewer`** is `null` until assigned. After assign it is `{ id, name, role, email }`.
- **`workflow`** field in the response maps to the `workflow_steps` column in the DB. The FE always reads `response.data.workflow`.
- **Action endpoints** always return the full approval object — the FE can use the response directly to replace the drawer state without a separate `GET /:id` call.
- **`addComment`** returns the full approval (not just the new comment) — the FE should replace `selectedApproval` with `response.data` to refresh all comments.
- **`reject` and `requestRevision`** validate that `reason` is present and non-empty — the FE must send it.
