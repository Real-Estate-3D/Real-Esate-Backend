# Projects API Contract

**Base URL:** `/api/v1/projects`
**Auth:** `Authorization: Bearer <token>` required on all endpoints.
In `development` environment auth is bypassed automatically.
**Content-Type:** `application/json`

---

## Status Values

| Value                | Label              |
|----------------------|--------------------|
| `pending_review`     | Pending Review     |
| `in_progress`        | In Progress        |
| `approved`           | Approved           |
| `rejected`           | Rejected           |
| `revision_requested` | Revision Requested |

## Project Type Values

| Value           | Label        |
|-----------------|--------------|
| `residential`   | Residential  |
| `commercial`    | Commercial   |
| `mixed_use`     | Mixed-Use    |
| `industrial`    | Industrial   |
| `institutional` | Institutional|

## Document Type Values (for `documents[].type`)

| Value                    | Label                     |
|--------------------------|---------------------------|
| `site_plan`              | Site Plan                 |
| `zoning_application`     | Zoning Application Form   |
| `environmental_assessment` | Environmental Assessment|
| `traffic_impact_study`   | Traffic Impact Study      |

---

## Endpoints

### 1. GET `/api/v1/projects/meta` — Form Metadata

Returns all dropdown values needed to populate the create and edit forms.
**Must be called before the create/edit forms open.**

#### Response `200`

```json
{
  "success": true,
  "data": {
    "projectTypes":  ["residential", "commercial", "mixed_use", "industrial", "institutional"],
    "statusValues":  ["pending_review", "in_progress", "approved", "rejected", "revision_requested"],
    "documentTypes": ["site_plan", "zoning_application", "environmental_assessment", "traffic_impact_study"]
  }
}
```

---

### 2. GET `/api/v1/projects` — List Projects

Returns a paginated list. Each item is a slim record without heavy JSONB detail blobs.

#### Query Parameters

| Param          | Type   | Default | Description |
|----------------|--------|---------|-------------|
| `page`         | number | `1`     | Page number |
| `limit`        | number | `10`    | Records per page |
| `search`       | string | —       | Searches across `name`, `applicant`, `location`, `description` |
| `status`       | string | `all`   | Filter by status value or `all` |
| `project_type` | string | `all`   | Filter by project type or `all` |

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Downtown Revitalization",
      "applicant": "Urban Horizons Inc.",
      "projectType": "commercial",
      "location": "Central District",
      "description": "Variance to reduce minimum setback requirements",
      "status": "pending_review",
      "submittedDate": "2025-08-25T00:00:00.000Z",
      "updatedAt": "2026-03-02T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 136,
    "page": 1,
    "limit": 10,
    "totalPages": 14
  }
}
```

---

### 3. POST `/api/v1/projects` — Create Project

Creates a new project. Status is automatically set to `pending_review`. A `created` entry is written to project history.

#### Request Body

| Field                      | Type    | Required | Description |
|----------------------------|---------|----------|-------------|
| `name`                     | string  | **Yes**  | Project name |
| `applicant`                | string  | **Yes**  | Applicant name or company |
| `projectType`              | string  | No       | One of the projectType values above |
| `description`              | string  | No       | Project description |
| `location`                 | string  | No       | Address or location string |
| `submittedDate`            | string  | No       | `YYYY-MM-DD`. Defaults to today |
| `parcelId`                 | string  | No       | Parcel reference ID |
| `parcelAddress`            | string  | No       | Human-readable parcel address |
| `proposedZoning`           | string  | No       | Proposed zoning classification |
| `useSiteSpecificZoning`    | boolean | No       | Defaults to `false` |
| `zoningInfo`               | object  | No       | Zoning details (see shape below) |
| `compliance`               | object  | No       | Compliance status (see shape below) |
| `documents`                | array   | No       | Uploaded documents (see shape below) |
| `model3d`                  | object  | No       | 3D model file reference |
| `legislativeChangeRequest` | object  | No       | Site-specific legislative change request |

**`zoningInfo` shape**
```json
{
  "currentZoning": "R2 - Residential",
  "landArea": "4.8 hectares",
  "officialPlanDesignation": "Urban Growth Center",
  "specialProvisions": "Oak Ridges Moraine Conservation Plan",
  "environmentalSensitivity": "Medium"
}
```

**`compliance` shape**
```json
{
  "percentage": 75,
  "items": [
    { "id": "c1", "name": "Submission Received", "status": "compliant" },
    { "id": "c2", "name": "Height Restrictions", "status": "compliant" },
    { "id": "c3", "name": "Parking Requirements", "status": "non_compliant", "notes": "Insufficient parking spaces" }
  ]
}
```

**`documents` item shape**
```json
{ "id": "doc-1", "name": "Environmental Report.pdf", "size": "3 MB", "type": "environmental_assessment" }
```

**`model3d` shape**
```json
{ "fileName": "Building 3D.OBJ", "size": "10.2 MB" }
```

**`legislativeChangeRequest` shape**
```json
{
  "parcelId": "324124",
  "existingLegislation": "Zoning By-law 2021-12 (v3)",
  "existingZoningCategory": "R1 - Residential",
  "changeRequests": [
    {
      "requirementType": "Minimum",
      "variable": "Lot Front Setback",
      "value": "10.0",
      "unit": "m",
      "notes": "Ensure pedestrian-friendly frontage"
    }
  ],
  "supportingDocuments": [],
  "reasonForRequest": "Explain reason here..."
}
```

#### Example Request Body
```json
{
  "name": "Downtown Revitalization",
  "applicant": "Urban Horizons Inc.",
  "projectType": "commercial",
  "description": "Variance to reduce minimum setback requirements",
  "location": "123 Main Street, Central District",
  "submittedDate": "2026-03-02",
  "parcelId": "324124",
  "parcelAddress": "123 Main Street, 0001-07-9832",
  "proposedZoning": "MU - Mixed Use",
  "useSiteSpecificZoning": true,
  "zoningInfo": {
    "currentZoning": "R2 - Residential",
    "landArea": "4.8 hectares",
    "officialPlanDesignation": "Urban Growth Center",
    "specialProvisions": "Oak Ridges Moraine",
    "environmentalSensitivity": "Medium"
  },
  "compliance": {
    "percentage": 75,
    "items": [
      { "id": "c1", "name": "Submission Received", "status": "compliant" },
      { "id": "c2", "name": "Height Restrictions", "status": "non_compliant", "notes": "Exceeds max by 21m" }
    ]
  },
  "documents": [
    { "id": "doc-1", "name": "Site Plan.pdf", "size": "2 MB", "type": "site_plan" }
  ],
  "model3d": { "fileName": "Building 3D.OBJ", "size": "10.2 MB" }
}
```

#### Response `201`

Returns the **Full Project Object** (see section below).

#### Error `400`
```json
{ "success": false, "message": "name and applicant are required" }
{ "success": false, "message": "projectType must be one of: residential, commercial, mixed_use, industrial, institutional" }
```

---

### 4. GET `/api/v1/projects/:id` — Get Project Detail

Returns the full project record including zoning, compliance, documents, comments, and history timeline.

#### Response `200`

Returns the **Full Project Object** (see section below).

#### Error `404`
```json
{ "success": false, "message": "Project not found" }
```

---

### 5. PUT `/api/v1/projects/:id` — Update Project

Updates any combination of project fields. Only fields included in the request body are changed — omitted fields remain untouched. A history entry is automatically written recording what changed.

If `status` is changed to `approved`, `rejected`, or `revision_requested`, the history entry action reflects that specific transition instead of generic `updated`.

#### Request Body

All fields from the create body are accepted. All are optional — only send what changed.

**Update general info only:**
```json
{
  "name": "Downtown Revitalization Phase 2",
  "description": "Updated scope to include Phase 2 commercial zones"
}
```

**Change status only:**
```json
{ "status": "approved" }
```

**Update zoning tab:**
```json
{
  "proposedZoning": "C1 - Commercial",
  "useSiteSpecificZoning": false,
  "zoningInfo": { "currentZoning": "R2 - Residential", "landArea": "5.2 hectares" }
}
```

**Update 3D model and compliance:**
```json
{
  "model3d": { "fileName": "Building_v2.OBJ", "size": "12 MB" },
  "compliance": { "percentage": 90, "items": [...] }
}
```

**Update documents tab:**
```json
{
  "documents": [
    { "id": "doc-1", "name": "Site Plan.pdf", "size": "2 MB", "type": "site_plan" },
    { "id": "doc-2", "name": "Environmental Report.pdf", "size": "3 MB", "type": "environmental_assessment" }
  ]
}
```

#### Response `200`

Returns the **Full Project Object** with all updates applied.

#### Errors
```json
{ "success": false, "message": "Project not found" }
{ "success": false, "message": "projectType must be one of: ..." }
{ "success": false, "message": "status must be one of: ..." }
```

---

### 6. DELETE `/api/v1/projects/:id` — Delete Project

Permanently deletes the project. All comments and history rows are automatically deleted via cascade.

#### Response `200`

```json
{ "success": true, "message": "Project deleted successfully" }
```

#### Error `404`
```json
{ "success": false, "message": "Project not found" }
```

---

### 7. POST `/api/v1/projects/:id/comments` — Add Comment

Adds a comment to the project. Returns the full project so the FE can refresh the comments section without a follow-up fetch.

#### Request Body

| Field    | Type   | Required | Description |
|----------|--------|----------|-------------|
| `text`   | string | **Yes**  | Comment body |
| `author` | string | No       | Display name. Falls back to authenticated user |
| `role`   | string | No       | Role label. Defaults to `"Reviewer"` |

```json
{
  "text": "Please clarify the boundary on the north side.",
  "author": "Sofia Davis",
  "role": "City Official"
}
```

#### Response `201`

Returns the **Full Project Object** with the new comment appended to `comments`.

#### Error `400`
```json
{ "success": false, "message": "Comment text is required" }
```

---

## Full Project Object

Returned by `GET /:id`, `POST /`, `PUT /:id`, and `POST /:id/comments`.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Downtown Revitalization",
  "applicant": "Urban Horizons Inc.",
  "projectType": "commercial",
  "description": "Variance to reduce minimum setback requirements",
  "location": "123 Main Street, Central District",
  "status": "pending_review",
  "submittedDate": "2026-03-02T00:00:00.000Z",
  "parcelId": "324124",
  "parcelAddress": "123 Main Street, 0001-07-9832",
  "proposedZoning": "MU - Mixed Use",
  "useSiteSpecificZoning": true,

  "zoningInfo": {
    "currentZoning": "R2 - Residential",
    "landArea": "4.8 hectares",
    "officialPlanDesignation": "Urban Growth Center",
    "specialProvisions": "Oak Ridges Moraine",
    "environmentalSensitivity": "Medium"
  },

  "compliance": {
    "percentage": 75,
    "items": [
      { "id": "c1", "name": "Submission Received",     "status": "compliant" },
      { "id": "c2", "name": "Height Restrictions",     "status": "compliant" },
      { "id": "c3", "name": "Parking Requirements",    "status": "non_compliant", "notes": "Insufficient spaces" }
    ]
  },

  "documents": [
    { "id": "doc-1", "name": "Site Plan.pdf", "size": "2 MB", "type": "site_plan" },
    { "id": "doc-2", "name": "Environmental Report.pdf", "size": "3 MB", "type": "environmental_assessment" }
  ],

  "model3d": {
    "fileName": "Building 3D.OBJ",
    "size": "10.2 MB"
  },

  "legislativeChangeRequest": {
    "parcelId": "324124",
    "existingLegislation": "Zoning By-law 2021-12 (v3)",
    "existingZoningCategory": "R1 - Residential",
    "changeRequests": [
      { "requirementType": "Minimum", "variable": "Lot Front Setback", "value": "10.0", "unit": "m", "notes": "..." }
    ],
    "supportingDocuments": [],
    "reasonForRequest": "..."
  },

  "comments": [
    {
      "id": "uuid",
      "author": "Sofia Davis",
      "role": "City Official",
      "text": "Please clarify the boundary on the north side.",
      "createdAt": "2026-03-02T12:40:00.000Z"
    }
  ],

  "history": [
    {
      "id": "uuid",
      "action": "created",
      "actorName": "System",
      "note": "Project submitted",
      "createdAt": "2026-03-02T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "action": "updated",
      "actorName": "Admin",
      "note": "Updated: description, zoningInfo",
      "createdAt": "2026-03-02T11:30:00.000Z"
    },
    {
      "id": "uuid",
      "action": "approved",
      "actorName": "Jane Smith",
      "note": "Updated: status",
      "createdAt": "2026-03-02T14:00:00.000Z"
    }
  ],

  "createdAt": "2026-03-02T10:00:00.000Z",
  "updatedAt": "2026-03-02T14:00:00.000Z"
}
```

---

## Database Tables

| Table              | Schema | Purpose |
|--------------------|--------|---------|
| `projects`         | public | Main record — all core fields + JSONB blobs |
| `project_comments` | public | Individual comments, one-to-many with projects |
| `project_history`  | public | Immutable audit trail / timeline — one row per action, no `updated_at` |

---

## Notes for FE Integration

- **`GET /meta`** must be registered before `GET /:id` in the route file to avoid collision — it already is.
- **All dates** are ISO 8601 strings (e.g. `"2026-03-02T10:00:00.000Z"`).
- **`PUT /:id`** is a partial update — send only the fields that changed. The FE edit modal can send just the active tab's fields on save.
- **Status changes** are done through `PUT /:id` with `{ "status": "approved" }` — there are no separate approve/reject endpoints (unlike the Approvals module).
- **`DELETE /:id`** cascades — all `project_comments` and `project_history` rows for that project are automatically removed.
- **`POST /:id/comments`** returns the full project object so the FE can replace the current detail state without a follow-up `GET /:id` call.
- **`history`** is the timeline shown in the detail view. Each action taken (create, update, approve, etc.) appends a new row.
- **`compliance.items[].status`** values are `"compliant"` and `"non_compliant"` (not camelCase).
- **SSL for local dev** — the database config now reads `DB_SSL=true` from `.env` to enable SSL. Leave this unset (or `DB_SSL=false`) for local PostgreSQL. Set `DB_SSL=true` when connecting to the remote AWS RDS instance.
