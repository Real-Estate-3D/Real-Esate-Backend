# Organization Management Architecture

## Scope
This module implements Organization Management and Organization Settings for:
- organization profile and setup status
- departments and teams
- people and invitations
- org-specific roles and positions
- org chart and node state
- import/export for departments and members
- organization audit history

## Multi-Organization Model
- Data is isolated by `organization_id`.
- Users join organizations through `organization.organization_members`.
- Access to an organization requires membership.
- Organization management writes are restricted to system roles `admin` and `city_official`.

## Persistence
All organization entities live in PostgreSQL schema `organization`:
- `organizations`
- `organization_members`
- `department`
- `team`
- `team_member`
- `position`
- `org_role`
- `invitation`
- `org_chart_node_state`
- `org_audit_log`
- `import_job`

## API Design
- Base path: `/api/v1/organizations/:organizationId`
- REST style routes with JSON payloads.
- Standard response shape:
  - success: boolean
  - data: object|array
  - message: optional human-readable message
  - pagination: when listing

## Audit & Change History
- Every mutating action writes to `organization.org_audit_log`.
- Department change history is sourced from audit rows filtered by department.

## Import/Export
- Supported formats: CSV, XLSX.
- Import is upsert-based:
  - departments keyed by `name` per organization
  - members keyed by `email` per organization
- Member import creates users if missing and creates pending-invite memberships.
