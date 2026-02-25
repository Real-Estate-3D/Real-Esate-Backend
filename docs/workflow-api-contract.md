# Workflow API Contract

This document defines the workflow module API contract used by the workflow UI today and by the approvals module in the next phase.

## Endpoints

- `GET /api/v1/workflows`
- `GET /api/v1/workflows/map`
- `GET /api/v1/workflows/metadata`
- `GET /api/v1/workflows/:id`
- `POST /api/v1/workflows`
- `PUT /api/v1/workflows/:id`
- `DELETE /api/v1/workflows/:id`

## Core Workflow Shape

`GET /api/v1/workflows` and `GET /api/v1/workflows/:id` return normalized workflow records with these key fields:

- `id: string`
- `name: string`
- `description: string`
- `status: "active" | "inactive" | "draft" | "completed"`
- `type: "project-specific" | "municipal" | "template"`
- `isTemplate: boolean`
- `project: string`
- `appliesTo: string[]`
- `jurisdiction: string`
- `jurisdictionId: string | null`
- `jurisdictionTierType: "upper_tier" | "lower_tier" | "single_tier" | null`
- `stepCount: number`
- `steps: WorkflowStep[]`
- `mapLocation: WorkflowMapLocation | null`

## Workflow Step Shape

Steps are persisted in `workflow_steps`, but API responses expose both camelCase and snake_case aliases for compatibility.

Canonical invariants:

- Step order is always sequential and 1-based on write (`step_order = index + 1`).
- The backend ignores incoming sparse/non-sequential `step_order` and rewrites it sequentially.
- A workflow must have at least one step.
- Step names must be non-empty.

Step payload fields:

- `id`
- `name`
- `description`
- `stepType` / `step_type`
- `stepOrder` / `step_order`
- `required`
- `assigneeRole` / `assignee_role`
- `requiredDocuments` / `required_documents`
- `relatedLegislation` / `related_legislation`

## `requiredDocuments` and `relatedLegislation`

### `requiredDocuments`

Array of:

- `id: string`
- `name: string` (required, unique within a step, case-insensitive)
- `mandatory: boolean`

### `relatedLegislation`

Array of:

- `id: string`
- `title: string` (required, unique within a step, case-insensitive)

## Map Location Semantics

`mapLocation` is derived from jurisdiction data and may be absent or unresolved.

Shape:

- `status: "mapped" | "unmapped"`
- `municipalityId: string | null`
- `tierType: string | null`
- `municipalityName: string | null`
- `latitude: number | null`
- `longitude: number | null`
- `reason: string | null`

Known unmapped reasons:

- `JURISDICTION_NOT_SET`
- `MUNICIPALITY_NOT_FOUND`

## Metadata Endpoint Contract

`GET /api/v1/workflows/metadata` returns:

- `stepLibrary: Array<{ id, name, label, stepType, usageCount }>`
- `assigneeRoleSuggestions: string[]`
- `projectSuggestions: string[]`
- `aiSuggestions`:
  - `starterSteps: Array<{ id, name, label, stepType, usageCount }>`
  - `transitions: Array<{ fromStepName, toStepName, toStepType, usageCount }>`
- `stats: { workflows, templates, active, steps }`

## Delete Conflict Behavior

Deleting a workflow linked to legislation returns `409 Conflict` with:

- `conflictType: "workflow_linked_to_legislation"`
- `linkedCount: number`

Clients should surface this as a non-retryable conflict and prompt the user to unlink or replace the workflow in legislation records first.
