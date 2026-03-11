# Legislation Module — API Contract

**Base URLs:**

| Resource        | Base URL                                          |
|-----------------|---------------------------------------------------|
| Processes       | `/api/v1/legislations`                            |
| Zoning Laws     | `/api/v1/zoning-laws`                             |
| Policies        | `/api/v1/policies`                                |
| Change History  | `/api/v1/change-history`                          |
| GIS Schedules   | `/api/v1/gis-schedules`                           |
| Workflows       | `/api/v1/workflows`                               |
| Branches        | `/api/v1/legislations/:legislationId/branches`    |
| Versions        | `/api/v1/legislations/:legislationId/versions`    |

**Auth:** `Authorization: Bearer <token>` required on all endpoints.
In `development` environment auth is bypassed automatically.
**Content-Type:** `application/json`

---

## 1. Processes (Legislations)

Corresponds to the **Processes** tab in the Legislation UI.

### Status Values

| Value              | Label              | Color  |
|--------------------|--------------------|--------|
| `active`           | Active             | Green  |
| `pending`          | Pending            | Amber  |
| `awaiting-approval`| Awaiting Approval  | Blue   |
| `rejected`         | Rejected           | Red    |
| `cancelled`        | Cancelled          | Gray   |
| `draft`            | Draft              | Gray   |
| `completed`        | Completed          | Green  |

---

### 1.1 GET `/api/v1/legislations` — List Processes

Returns paginated list of legislations.

#### Query Parameters

| Param        | Type   | Default      | Description |
|--------------|--------|--------------|-------------|
| `page`       | number | `1`          | Page number |
| `limit`      | number | `10`         | Records per page |
| `search`     | string | —            | Searches `title`, `process` |
| `status`     | string | `all`        | Filter by status. Pass `all` to return all |
| `type`       | string | `all`        | Filter by `legislation_type`. Pass `all` to return all |
| `jurisdiction`| string| —            | Filter by jurisdiction |
| `sortBy`     | string | `updated_at` | Sort column |
| `sortOrder`  | string | `DESC`       | `ASC` or `DESC` |

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Zoning By-Law Amendment Process",
      "process": "Submission, Review, Approval",
      "status": "active",
      "effectiveFrom": "2025-03-25",
      "legislationType": "Zoning By-law",
      "jurisdiction": "City of Toronto",
      "municipality": "Toronto",
      "description": "Process for zoning amendments",
      "workflow": { "id": "uuid", "name": "Standard Zoning Workflow" },
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-02-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 108,
    "page": 1,
    "limit": 10,
    "totalPages": 11
  }
}
```

---

### 1.2 GET `/api/v1/legislations/:id` — Get Legislation Detail

Returns a single legislation with all related data.

#### Response `200`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Zoning By-Law Amendment Process",
    "process": "Submission, Review, Approval",
    "status": "active",
    "legislationType": "Zoning By-law",
    "effectiveFrom": "2025-03-25",
    "effectiveTo": null,
    "jurisdiction": "City of Toronto",
    "municipality": "Toronto",
    "description": "Description text",
    "fullText": "Full legal text...",
    "workflowId": "uuid",
    "workflow": { "id": "uuid", "name": "Standard Zoning Workflow", "steps": [] },
    "zoningLaws": [],
    "policies": [],
    "gisSchedules": [],
    "changeHistory": [],
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-02-20T00:00:00.000Z"
  }
}
```

#### Error `404`
```json
{ "success": false, "message": "Legislation not found" }
```

---

### 1.3 POST `/api/v1/legislations` — Create Legislation

#### Request Body

| Field              | Type   | Required | Description |
|--------------------|--------|----------|-------------|
| `title`            | string | **Yes**  | Legislation title |
| `process`          | string | No       | Steps e.g. `"Submission, Review, Approval"` |
| `status`           | string | No       | Defaults to `draft` |
| `legislation_type` | string | No       | `Zoning By-law`, `Site-Specific Zoning`, `Official Plan`, etc. |
| `effective_from`   | string | No       | `YYYY-MM-DD` |
| `effective_to`     | string | No       | `YYYY-MM-DD` |
| `jurisdiction`     | string | No       | Jurisdiction name |
| `municipality`     | string | No       | Municipality name |
| `description`      | string | No       | Short description |
| `full_text`        | string | No       | Full legal text content |
| `workflow_id`      | string | No       | UUID of the linked workflow |

#### Response `201`
Returns the created legislation object.

---

### 1.4 PUT `/api/v1/legislations/:id` — Update Legislation

Accepts same fields as POST. Returns updated legislation.

---

### 1.5 DELETE `/api/v1/legislations/:id` — Delete Legislation

#### Response `200`
```json
{ "success": true, "message": "Legislation deleted successfully" }
```

---

### 1.6 POST `/api/v1/legislations/:id/publish` — Publish Legislation

Sets `status` to `active`. Records a `published` change history entry.

#### Response `200`
Returns updated legislation with `status: "active"`.

---

## 2. Zoning Laws

Corresponds to the **Zoning Laws** tab.

### 2.1 GET `/api/v1/zoning-laws` — List Zoning Laws

#### Query Parameters

| Param          | Type   | Default      | Description |
|----------------|--------|--------------|-------------|
| `page`         | number | `1`          | Page number |
| `limit`        | number | `10`         | Records per page |
| `search`       | string | —            | Searches `title`, `number`, `zone_code` |
| `type`         | string | `all`        | Filter by type (`Residential`, `Commercial`, etc.) |
| `status`       | string | `all`        | Filter by status |
| `municipality` | string | —            | Filter by municipality |
| `jurisdiction` | string | —            | Filter by jurisdiction |
| `sortBy`       | string | `updated_at` | Sort column |
| `sortOrder`    | string | `DESC`       | `ASC` or `DESC` |

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Residential Zoning By-law 143-B",
      "number": "143-B",
      "type": "Residential",
      "effectiveFrom": "2025-03-25",
      "validityStatus": "Violate provincial policy",
      "status": "Active",
      "zoneCode": "R1",
      "zoneName": "Low Density Residential",
      "description": "...",
      "parameters": [
        { "label": "Max Height", "value": "10", "unit": "m" },
        { "label": "Setback", "value": "3.0", "unit": "m" }
      ],
      "municipality": "Toronto",
      "jurisdiction": "City of Toronto",
      "version": 1,
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-02-20T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 108, "page": 1, "limit": 10, "totalPages": 11 }
}
```

---

### 2.2 GET `/api/v1/zoning-laws/:id` — Get Zoning Law Detail

Returns full zoning law including GIS schedules and change history.

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "...",
    "number": "143-B",
    "type": "Residential",
    "effectiveFrom": "2025-03-25",
    "validityStatus": "...",
    "status": "Active",
    "zoneCode": "R1",
    "zoneName": "...",
    "description": "...",
    "fullText": "Full legal text...",
    "parameters": [],
    "geometry": { "type": "Polygon", "coordinates": [] },
    "municipality": "Toronto",
    "jurisdiction": "City of Toronto",
    "legislationId": "uuid",
    "version": 1,
    "gisSchedules": [],
    "changeHistory": []
  }
}
```

---

### 2.3 POST `/api/v1/zoning-laws` — Create Zoning Law

#### Request Body

| Field             | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| `title`           | string | **Yes**  | Zoning law name |
| `number`          | string | No       | Law number e.g. `"143-B"` |
| `type`            | string | No       | `Residential` \| `Commercial` \| `Industrial` \| `Mixed-Use` \| `Agricultural` \| `Open Space`. Defaults to `Residential` |
| `effective_from`  | string | No       | `YYYY-MM-DD` |
| `effective_to`    | string | No       | `YYYY-MM-DD` |
| `validity_status` | string | No       | Validity description |
| `status`          | string | No       | Defaults to `Draft` |
| `zone_code`       | string | No       | Zone identifier e.g. `"R1"` |
| `zone_name`       | string | No       | Zone name |
| `description`     | string | No       | Description |
| `full_text`       | string | No       | Full legal text |
| `parameters`      | array  | No       | `[{ "label": "Max Height", "value": "10", "unit": "m" }]` |
| `geometry`        | object | No       | GeoJSON geometry (polygon drawn on map) |
| `municipality`    | string | No       | Municipality name |
| `jurisdiction`    | string | No       | Jurisdiction name |
| `legislation_id`  | string | No       | UUID of parent legislation |

#### Response `201`
Returns created zoning law.

---

### 2.4 PUT `/api/v1/zoning-laws/:id` — Update Zoning Law

Accepts same fields as POST.

---

### 2.5 DELETE `/api/v1/zoning-laws/:id` — Delete Zoning Law

```json
{ "success": true, "message": "Zoning law deleted successfully" }
```

---

### 2.6 POST `/api/v1/zoning-laws/:id/duplicate` — Duplicate Zoning Law

Creates a copy with title `"... (Copy)"` and status `Draft`.

#### Response `201`
Returns the new duplicated zoning law.

---

### 2.7 GET `/api/v1/zoning-laws/zone-code/:code` — Get by Zone Code

Returns all zoning laws with the given `zone_code`, ordered by version descending.

---

### 2.8 GET `/api/v1/zoning-laws/municipality/:municipality` — Get by Municipality

Returns all zoning laws for a given municipality (case-insensitive partial match).

---

## 3. Policies

Corresponds to the **Policies** tab.

### 3.1 GET `/api/v1/policies` — List Policies

#### Query Parameters

| Param          | Type   | Default | Description |
|----------------|--------|---------|-------------|
| `page`         | number | `1`     | Page number |
| `limit`        | number | `10`    | Records per page |
| `search`       | string | —       | Searches `name`, `rules` |
| `category`     | string | `all`   | Filter by category |
| `status`       | string | `all`   | Filter by status |
| `jurisdiction` | string | —       | Filter by jurisdiction |
| `sortBy`       | string | `name`  | Sort column |
| `sortOrder`    | string | `ASC`   | `ASC` or `DESC` |

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Provincial Policy 101",
      "category": "Environmental",
      "rules": "Max Height 20m, Setbacks 10m...",
      "fullText": "Full policy text...",
      "parameters": [],
      "status": "active",
      "effectiveFrom": "2025-01-01",
      "effectiveTo": null,
      "jurisdiction": "Province of Ontario",
      "municipality": null,
      "version": 1,
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-02-20T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 }
}
```

---

### 3.2 GET `/api/v1/policies/categories` — List Categories

Returns distinct category values.

```json
{
  "success": true,
  "data": ["Environmental", "Zoning", "Safety", "Cultural Heritage", "Sustainability"]
}
```

---

### 3.3 GET `/api/v1/policies/:id` — Get Policy Detail

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Provincial Policy 101",
    "category": "Environmental",
    "rules": "Max Height 20m...",
    "fullText": "Full policy text...",
    "parameters": [
      { "label": "Max Height", "value": "20", "unit": "m" }
    ],
    "status": "active",
    "effectiveFrom": "2025-01-01",
    "effectiveTo": null,
    "jurisdiction": "Province of Ontario",
    "municipality": null,
    "legislationId": "uuid",
    "version": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 3.4 POST `/api/v1/policies` — Create Policy

#### Request Body

| Field            | Type   | Required | Description |
|------------------|--------|----------|-------------|
| `name`           | string | **Yes**  | Policy name |
| `category`       | string | **Yes**  | Category (e.g. `Environmental`, `Zoning`) |
| `rules`          | string | No       | Rules description |
| `full_text`      | string | No       | Full policy text |
| `parameters`     | array  | No       | `[{ "label": "...", "value": "...", "unit": "..." }]` |
| `status`         | string | No       | Defaults to `active` |
| `effective_from` | string | No       | `YYYY-MM-DD` |
| `effective_to`   | string | No       | `YYYY-MM-DD` |
| `jurisdiction`   | string | No       | Jurisdiction name |
| `municipality`   | string | No       | Municipality name |
| `legislation_id` | string | No       | UUID of parent legislation |

#### Response `201`
Returns created policy.

---

### 3.5 PUT `/api/v1/policies/:id` — Update Policy

Accepts same fields as POST.

---

### 3.6 DELETE `/api/v1/policies/:id` — Delete Policy

```json
{ "success": true, "message": "Policy deleted successfully" }
```

---

## 4. Change History

Corresponds to the **Change History** tab.

### 4.1 GET `/api/v1/change-history` — List Change History

#### Query Parameters

| Param            | Type   | Default | Description |
|------------------|--------|---------|-------------|
| `page`           | number | `1`     | Page number |
| `limit`          | number | `10`    | Records per page |
| `search`         | string | —       | Searches `description` |
| `change_type`    | string | `all`   | Filter by change type |
| `date_from`      | string | —       | Start date `YYYY-MM-DD` |
| `date_to`        | string | —       | End date `YYYY-MM-DD` |
| `legislation_id` | string | —       | Filter by legislation UUID |
| `zoning_law_id`  | string | —       | Filter by zoning law UUID |
| `sortBy`         | string | `date`  | Sort column |
| `sortOrder`      | string | `DESC`  | `ASC` or `DESC` |

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2025-03-25",
      "description": "The Comprehensive Zoning By-Law Amendment Process: Understanding the Steps",
      "changeType": "created",
      "affectedEntities": [
        { "type": "legislation", "id": "uuid", "title": "Zoning By-Law Amendment", "url": "/legislations/uuid" }
      ],
      "legislation": { "id": "uuid", "title": "Zoning By-Law Amendment" },
      "zoningLaw": null,
      "userName": "John Doe",
      "createdAt": "2026-01-15T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 108, "page": 1, "limit": 10, "totalPages": 11 }
}
```

### Change Type Values

| Value               | Description |
|---------------------|-------------|
| `created`           | Record was created |
| `updated`           | Record was updated |
| `deleted`           | Record was deleted |
| `published`         | Legislation was published |
| `approved`          | Legislation was approved |
| `rejected`          | Legislation was rejected |
| `version_created`   | A new version snapshot was created |

---

### 4.2 GET `/api/v1/change-history/:id` — Get Single Record

---

### 4.3 GET `/api/v1/change-history/legislation/:id` — History for Legislation

Returns all change history entries for a specific legislation (paginated, newest first).

---

### 4.4 GET `/api/v1/change-history/zoning-law/:id` — History for Zoning Law

Returns all change history entries for a specific zoning law.

---

## 5. GIS Schedules

### 5.1 GET `/api/v1/gis-schedules` — List GIS Schedules

#### Query Parameters

| Param          | Type   | Default      | Description |
|----------------|--------|--------------|-------------|
| `page`         | number | `1`          | Page number |
| `limit`        | number | `10`         | Records per page |
| `search`       | string | —            | Searches `name`, `description` |
| `scheduleType` | string | —            | Filter by schedule type |
| `legislationId`| string | —            | Filter by legislation UUID |
| `sortBy`       | string | `created_at` | Sort column |
| `sortOrder`    | string | `ASC`        | `ASC` or `DESC` |

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Downtown Mixed Use Zone Map",
      "scheduleType": "zoning_schedule",
      "filePath": null,
      "fileType": null,
      "fileSize": null,
      "geometry": { "type": "Polygon", "coordinates": [] },
      "style": { "fillColor": "#3388ff", "opacity": 0.4 },
      "wmsLayer": null,
      "status": "active",
      "legislationId": "uuid",
      "legislation": { "id": "uuid", "title": "Zoning By-law" },
      "layer": { "id": 1, "name": "Municipal Zoning", "layer_type": "WMS" },
      "createdAt": "2026-01-15T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 20, "page": 1, "limit": 10, "totalPages": 2 }
}
```

---

### 5.2 GET `/api/v1/gis-schedules/types` — Get Schedule Types

```json
{
  "success": true,
  "data": [
    { "value": "map_schedule",    "label": "Map Schedule" },
    { "value": "zoning_schedule", "label": "Zoning Schedule" },
    { "value": "land_use",        "label": "Land Use" },
    { "value": "height_density",  "label": "Height & Density" },
    { "value": "parking",         "label": "Parking" },
    { "value": "environmental",   "label": "Environmental" },
    { "value": "heritage",        "label": "Heritage" },
    { "value": "urban_design",    "label": "Urban Design" },
    { "value": "other",           "label": "Other" }
  ]
}
```

---

### 5.3 GET `/api/v1/gis-schedules/by-legislation/:legislationId` — By Legislation

Returns all GIS schedules for a legislation (ordered by `created_at` ASC).

---

### 5.4 GET `/api/v1/gis-schedules/:id` — Get Single GIS Schedule

---

### 5.5 POST `/api/v1/gis-schedules` — Create GIS Schedule (Manual / Polygon)

#### Request Body

| Field            | Type   | Required | Description |
|------------------|--------|----------|-------------|
| `name`           | string | **Yes**  | Schedule name |
| `schedule_type`  | string | **Yes**  | Schedule type (see types endpoint) |
| `legislation_id` | string | No       | Parent legislation UUID |
| `zoning_law_id`  | string | No       | Parent zoning law UUID |
| `geometry`       | object | No       | GeoJSON polygon drawn on map |
| `style`          | object | No       | `{ fillColor, strokeColor, opacity }` |
| `wms_layer`      | string | No       | GeoServer WMS layer name |
| `gis_layer_id`   | number | No       | Reference to a GIS layer |

#### Response `201`
Returns created GIS schedule.

---

### 5.6 POST `/api/v1/gis-schedules/upload` — Upload GIS File

`Content-Type: multipart/form-data`

| Field           | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| `file`          | file   | **Yes**  | GIS file (.shp, .geojson, .kml, etc.) |
| `legislationId` | string | **Yes**  | Parent legislation UUID |
| `name`          | string | **Yes**  | Schedule name |
| `scheduleType`  | string | No       | Defaults to `map_schedule` |
| `description`   | string | No       | Description |

#### Response `201`
Returns created GIS schedule record with `filePath` set.

---

### 5.7 PUT `/api/v1/gis-schedules/:id` — Update GIS Schedule

---

### 5.8 DELETE `/api/v1/gis-schedules/:id` — Delete GIS Schedule

Also removes the file from disk if one was uploaded.

---

## 6. Workflows

Used in the **Required Workflows** step of Create New Legislation wizard.

### 6.1 GET `/api/v1/workflows` — List Workflows

#### Query Parameters

| Param          | Type   | Default | Description |
|----------------|--------|---------|-------------|
| `page`         | number | `1`     | Page number |
| `limit`        | number | `10`    | Max 100 |
| `search`       | string | —       | Searches name, description, project, jurisdiction |
| `type`         | string | —       | `project-specific` \| `municipal` \| `template` |
| `status`       | string | —       | `active` \| `inactive` \| `draft` \| `completed` |
| `category`     | string | —       | `template` \| `general` |
| `jurisdiction` | string | —       | Filter by jurisdiction |

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Standard Zoning Workflow",
      "description": "...",
      "type": "template",
      "isTemplate": true,
      "project": null,
      "appliesTo": [],
      "status": "active",
      "jurisdiction": "City of Toronto",
      "steps": [
        {
          "id": "uuid",
          "name": "Submit Application",
          "stepType": "submission",
          "stepOrder": 1,
          "required": true,
          "durationDays": 5,
          "assigneeRole": "Applicant"
        }
      ],
      "mapLocation": {
        "status": "mapped",
        "municipalityId": "...",
        "tierType": "lower_tier",
        "municipalityName": "City of Toronto",
        "latitude": 43.7,
        "longitude": -79.4
      }
    }
  ],
  "pagination": { "total": 30, "page": 1, "limit": 10, "totalPages": 3 }
}
```

---

### 6.2 GET `/api/v1/workflows/map` — Map Mode Workflows

Returns all workflows with map location data, grouped into `mapped` / `unmapped`.

---

### 6.3 GET `/api/v1/workflows/metadata` — Workflow Builder Metadata

Returns step library, role suggestions, and project suggestions for the workflow builder.

---

### 6.4 GET `/api/v1/workflows/:id` — Get Workflow Detail

Returns the workflow with all steps and map location.

---

### 6.5 POST `/api/v1/workflows` — Create Workflow

#### Request Body

| Field          | Type    | Required | Description |
|----------------|---------|----------|-------------|
| `name`         | string  | **Yes**  | Workflow name |
| `description`  | string  | No       | Description |
| `type`         | string  | No       | `project-specific` \| `municipal` \| `template`. Defaults to `project-specific` |
| `is_template`  | boolean | No       | Whether this is a reusable template |
| `project`      | string  | No       | Associated project name |
| `applies_to`   | array   | No       | List of application types this workflow applies to |
| `status`       | string  | No       | Defaults to `active` |
| `jurisdiction` | string  | No       | Jurisdiction name |
| `jurisdiction_id` | string | No    | Jurisdiction ID |
| `jurisdiction_tier_type` | string | No | Jurisdiction tier |
| `steps`        | array   | No       | Array of workflow step objects (see below) |

**Step object shape:**
```json
{
  "name": "Submit Application",
  "description": "...",
  "step_order": 1,
  "step_type": "submission",
  "required": true,
  "duration_days": 5,
  "assignee_role": "Applicant",
  "required_documents": [],
  "related_legislation": []
}
```

**`step_type` values:** `submission` | `review` | `approval` | `notification` | `inspection` | `finalization`

---

### 6.6 PUT `/api/v1/workflows/:id` — Update Workflow

Replaces all steps on update (send the complete steps array).

---

### 6.7 DELETE `/api/v1/workflows/:id` — Delete Workflow

Returns `409` if the workflow is linked to legislation records.

```json
{
  "success": false,
  "message": "This workflow is linked to legislation records and cannot be deleted",
  "conflictType": "workflow_linked_to_legislation",
  "linkedCount": 3
}
```

---

## 7. Legislation Branches

Corresponds to the **Branching** diagram in the Legislation UI.

### 7.1 GET `/api/v1/legislations/:legislationId/branches` — List Branches

#### Query Parameters: `page`, `limit`, `status`, `sortBy`, `sortOrder`

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Main",
      "description": null,
      "status": "active",
      "isMain": true,
      "parentBranchId": null,
      "baseVersionId": null,
      "mergedAt": null,
      "mergedBy": null,
      "mergedIntoBranchId": null,
      "metadata": { "isApplied": true },
      "createdBy": 1,
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-02-20T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 7.2 GET `/api/v1/legislations/:legislationId/branches/timeline` — Branch Timeline

Returns branch data formatted for the timeline/Gantt visualization.

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Main",
      "isMain": true,
      "status": "active",
      "startDate": "2026-01-15T00:00:00.000Z",
      "endDate": null,
      "mergedInto": null,
      "isApplied": true
    }
  ]
}
```

---

### 7.3 GET `/api/v1/legislations/:legislationId/branches/:id` — Get Branch

---

### 7.4 POST `/api/v1/legislations/:legislationId/branches` — Create Branch

#### Request Body

| Field              | Type   | Required | Description |
|--------------------|--------|----------|-------------|
| `name`             | string | **Yes**  | Branch name e.g. `"Zoning amendment 2025-07-08"` |
| `description`      | string | No       | Description |
| `parent_branch_id` | number | No       | ID of parent branch |
| `base_version_id`  | number | No       | ID of base version |
| `metadata`         | object | No       | Arbitrary metadata |

---

### 7.5 PUT `/api/v1/legislations/:legislationId/branches/:id` — Update Branch

---

### 7.6 DELETE `/api/v1/legislations/:legislationId/branches/:id` — Delete Branch

Cannot delete the main branch (returns `400`).

---

### 7.7 POST `/api/v1/legislations/:legislationId/branches/:id/apply` — Apply Branch

Marks a branch as applied in metadata.

#### Request Body
```json
{ "apply": true }
```

---

### 7.8 POST `/api/v1/legislations/:legislationId/branches/:id/merge` — Merge Branch

Sets branch status to `merged`.

#### Request Body
```json
{ "target_branch_id": 1 }
```

#### Error `404`
```json
{ "success": false, "message": "Target branch not found" }
```

---

## 8. Legislation Versions

Corresponds to the **Version History** modal in the Legislation UI.

### 8.1 GET `/api/v1/legislations/:legislationId/versions` — List Versions

#### Query Parameters: `page`, `limit`, `sortBy` (default `version_number`), `sortOrder` (default `DESC`)

#### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "legislationId": "uuid",
      "versionNumber": 5,
      "title": "Zoning By-Law Amendment v5",
      "content": "Full text content...",
      "changesSummary": "Changed setback from 3.0m to 4.2m",
      "snapshot": {},
      "status": "approved",
      "createdBy": 1,
      "approvedBy": 2,
      "approvedAt": "2026-02-10T00:00:00.000Z",
      "creator": { "id": 1, "name": "John Doe", "email": "john@example.com" },
      "createdAt": "2026-02-10T00:00:00.000Z",
      "updatedAt": "2026-02-10T00:00:00.000Z"
    }
  ],
  "pagination": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 8.2 GET `/api/v1/legislations/:legislationId/versions/:versionId` — Get Version

Returns a single version with creator info and full snapshot.

---

### 8.3 POST `/api/v1/legislations/:legislationId/versions` — Create Version Snapshot

Creates a snapshot of the current legislation state as a new version. The `version_number` is auto-incremented.

#### Request Body

| Field             | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| `title`           | string | No       | Defaults to legislation title |
| `content`         | string | No       | Defaults to legislation `full_text` |
| `changes_summary` | string | No       | What changed in this version |

#### Response `201`
Returns the created version object.

---

## Database Tables

| Table                   | Purpose |
|-------------------------|---------|
| `legislations`          | Main legislation / process records |
| `legislation_versions`  | Version snapshots for legislation |
| `legislation_branches`  | Amendment branches (main + feature branches) |
| `zoning_laws`           | Individual zoning law records |
| `policies`              | Policy records |
| `gis_layers`            | Available GIS map layers (WMS/WFS catalog) |
| `gis_schedules`         | GIS schedule attachments (polygons / uploaded files) |
| `workflows`             | Workflow templates and instances |
| `workflow_steps`        | Steps within each workflow |
| `change_history`        | Audit trail for all changes |

---

## Notes for FE Integration

- **All dates** are ISO 8601 strings or `YYYY-MM-DD` date-only strings depending on the field.
- **`geometry`** fields accept and return GeoJSON. For polygon drawing, send `{ "type": "Polygon", "coordinates": [...] }`.
- **`parameters`** arrays use `[{ "label": "Max Height", "value": "10", "unit": "m" }]` shape for both zoning laws and policies.
- **`affected_entities`** in change history use `[{ "type": "legislation|zoning_law|policy|branch", "id": "...", "title": "...", "url": "..." }]`.
- **Pagination** — all list endpoints return a `pagination` object: `{ total, page, limit, totalPages }`.
- **Create Legislation Wizard** — the 7-step wizard calls multiple endpoints sequentially:
  1. **Step 1 (Context & Scope)** → `POST /api/v1/legislations` to create the base record
  2. **Step 2 (GIS Schedules)** → `POST /api/v1/gis-schedules` for each schedule (or `POST /api/v1/gis-schedules/upload` for file upload)
  3. **Step 3 (Subdivision)** → managed client-side (no separate API needed)
  4. **Step 4 (Parameters)** → `PUT /api/v1/zoning-laws/:id` to update zoning law parameters
  5. **Step 5 (Required Workflows)** → `PUT /api/v1/legislations/:id` to set `workflow_id`
  6. **Step 6 (Massing Simulation)** → managed client-side
  7. **Step 7 (Review & Publish)** → `POST /api/v1/legislations/:id/publish`
- **Permission scopes**: All legislation endpoints require `legislation` tool permission. View operations need `view`, write operations need `edit`.
- **Geometry validation**: `POST/PUT` for zoning laws and GIS schedules validates that the polygon geometry falls within the user's assigned jurisdiction. Returns `422` if outside bounds.
