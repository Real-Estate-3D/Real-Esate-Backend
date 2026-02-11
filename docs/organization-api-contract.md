# Organization API Contract

## Base
`/api/v1/organizations`

## Organization
- `GET /` list organizations accessible to current user
- `POST /` create organization
- `GET /:organizationId/profile`
- `PUT /:organizationId/profile`
- `GET /:organizationId/setup-status`
- `PUT /:organizationId/setup-status`

## Departments
- `GET /:organizationId/departments`
- `POST /:organizationId/departments`
- `GET /:organizationId/departments/:departmentId`
- `PUT /:organizationId/departments/:departmentId`
- `DELETE /:organizationId/departments/:departmentId`
- `GET /:organizationId/departments/:departmentId/change-history`
- `GET /:organizationId/departments/:departmentId/teams`
- `POST /:organizationId/departments/:departmentId/teams`

## Teams
- `GET /:organizationId/teams/:teamId`
- `PUT /:organizationId/teams/:teamId`
- `DELETE /:organizationId/teams/:teamId`

## Members & Invitations
- `GET /:organizationId/members`
- `GET /:organizationId/members/:memberId`
- `PUT /:organizationId/members/:memberId`
- `POST /:organizationId/invitations/bulk`
- `POST /:organizationId/members/:memberId/change-team`
- `POST /:organizationId/members/:memberId/change-position`
- `POST /:organizationId/members/:memberId/change-role`
- `POST /:organizationId/members/:memberId/move-department`
- `POST /:organizationId/members/:memberId/deactivate`

## Org Settings
- `GET /:organizationId/org-roles`
- `POST /:organizationId/org-roles`
- `PUT /:organizationId/org-roles/:orgRoleId`
- `DELETE /:organizationId/org-roles/:orgRoleId`
- `PUT /:organizationId/org-roles/permissions-matrix`
- `GET /:organizationId/positions`
- `POST /:organizationId/positions`
- `PUT /:organizationId/positions/:positionId`
- `DELETE /:organizationId/positions/:positionId`

## Org Chart
- `GET /:organizationId/org-chart`
- `POST /:organizationId/org-chart/nodes/:memberId/children`
- `DELETE /:organizationId/org-chart/nodes/:memberId`
- `PATCH /:organizationId/org-chart/nodes/:memberId/collapsed`

## Import/Export
- `GET /:organizationId/export?entity=departments|members&format=csv|xlsx`
- `POST /:organizationId/import?entity=departments|members`
- `GET /:organizationId/import/template?entity=departments|members&format=csv|xlsx`
