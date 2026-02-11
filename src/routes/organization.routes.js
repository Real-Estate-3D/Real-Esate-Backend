const express = require('express');
const organizationController = require('../controllers/organization/organization.controller');
const departmentController = require('../controllers/organization/department.controller');
const teamController = require('../controllers/organization/team.controller');
const memberController = require('../controllers/organization/member.controller');
const orgSettingsController = require('../controllers/organization/orgSettings.controller');
const orgChartController = require('../controllers/organization/orgChart.controller');
const importExportController = require('../controllers/organization/importExport.controller');
const { authenticate } = require('../middleware/auth');
const {
  resolveOrganizationContext,
  requireOrganizationMember,
  authorizeOrganizationManager,
} = require('../middleware/organizationAuth');
const { uploadImage, uploadAny } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate);

router.get('/', organizationController.getOrganizations);
router.post('/', authorizeOrganizationManager, organizationController.createOrganization);

router.use('/:organizationId', resolveOrganizationContext, requireOrganizationMember);

// Organization profile and setup
router.get('/:organizationId/profile', organizationController.getProfile);
router.put('/:organizationId/profile', authorizeOrganizationManager, uploadImage.single('logo'), organizationController.updateProfile);
router.get('/:organizationId/setup-status', organizationController.getSetupStatus);
router.put('/:organizationId/setup-status', authorizeOrganizationManager, organizationController.updateSetupStatus);

// Departments
router.get('/:organizationId/departments', departmentController.getDepartments);
router.post('/:organizationId/departments', authorizeOrganizationManager, departmentController.createDepartment);
router.get('/:organizationId/departments/:departmentId', departmentController.getDepartmentById);
router.put('/:organizationId/departments/:departmentId', authorizeOrganizationManager, departmentController.updateDepartment);
router.delete('/:organizationId/departments/:departmentId', authorizeOrganizationManager, departmentController.deleteDepartment);
router.get('/:organizationId/departments/:departmentId/change-history', departmentController.getDepartmentChangeHistory);
router.get('/:organizationId/departments/:departmentId/teams', departmentController.getDepartmentTeams);
router.post('/:organizationId/departments/:departmentId/teams', authorizeOrganizationManager, departmentController.createDepartmentTeam);

// Teams
router.get('/:organizationId/teams/:teamId', teamController.getTeamById);
router.put('/:organizationId/teams/:teamId', authorizeOrganizationManager, teamController.updateTeam);
router.delete('/:organizationId/teams/:teamId', authorizeOrganizationManager, teamController.deleteTeam);

// Members + Invitations
router.get('/:organizationId/members', memberController.getMembers);
router.get('/:organizationId/members/:memberId', memberController.getMemberById);
router.put('/:organizationId/members/:memberId', authorizeOrganizationManager, memberController.updateMember);
router.post('/:organizationId/invitations/bulk', authorizeOrganizationManager, memberController.inviteBulk);
router.post('/:organizationId/members/:memberId/change-team', authorizeOrganizationManager, memberController.changeTeam);
router.post('/:organizationId/members/:memberId/change-position', authorizeOrganizationManager, memberController.changePosition);
router.post('/:organizationId/members/:memberId/change-role', authorizeOrganizationManager, memberController.changeRole);
router.post('/:organizationId/members/:memberId/move-department', authorizeOrganizationManager, memberController.moveDepartment);
router.post('/:organizationId/members/:memberId/deactivate', authorizeOrganizationManager, memberController.deactivateMember);

// Org settings
router.get('/:organizationId/permissions/me', orgSettingsController.getMyPermissions);
router.get('/:organizationId/org-roles', orgSettingsController.getOrgRoles);
router.post('/:organizationId/org-roles', authorizeOrganizationManager, orgSettingsController.createOrgRole);
router.put('/:organizationId/org-roles/permissions-matrix', authorizeOrganizationManager, orgSettingsController.updatePermissionsMatrix);
router.put('/:organizationId/org-roles/:orgRoleId', authorizeOrganizationManager, orgSettingsController.updateOrgRole);
router.delete('/:organizationId/org-roles/:orgRoleId', authorizeOrganizationManager, orgSettingsController.deleteOrgRole);
router.get('/:organizationId/positions', orgSettingsController.getPositions);
router.post('/:organizationId/positions', authorizeOrganizationManager, orgSettingsController.createPosition);
router.put('/:organizationId/positions/:positionId', authorizeOrganizationManager, orgSettingsController.updatePosition);
router.delete('/:organizationId/positions/:positionId', authorizeOrganizationManager, orgSettingsController.deletePosition);

// Org chart
router.get('/:organizationId/org-chart', orgChartController.getOrgChart);
router.post('/:organizationId/org-chart/nodes/:memberId/children', authorizeOrganizationManager, orgChartController.addChild);
router.delete('/:organizationId/org-chart/nodes/:memberId', authorizeOrganizationManager, orgChartController.removeNode);
router.patch('/:organizationId/org-chart/nodes/:memberId/collapsed', authorizeOrganizationManager, orgChartController.updateCollapsedState);

// Import/Export
router.get('/:organizationId/export', importExportController.exportData);
router.post('/:organizationId/import', authorizeOrganizationManager, uploadAny.single('file'), importExportController.importData);
router.get('/:organizationId/import/template', importExportController.downloadTemplate);

module.exports = router;
