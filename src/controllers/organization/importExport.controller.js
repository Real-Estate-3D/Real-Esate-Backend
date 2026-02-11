const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  Department,
  OrganizationMember,
  User,
  Team,
  Position,
  OrgRole,
  Invitation,
  TeamMember,
  ImportJob,
} = require('../../models');
const { parseImportFile, buildCsvBuffer, buildXlsxBuffer, buildTemplateRows } = require('../../utils/importExport');
const { generateInviteToken, normalizeStatus } = require('./helpers');
const { logOrgAudit } = require('../../utils/orgAudit');

const VALID_ENTITIES = ['departments', 'members'];
const VALID_FORMATS = ['csv', 'xlsx'];

const safeUnlink = (targetPath) => {
  if (!targetPath) return;
  try {
    fs.unlinkSync(targetPath);
  } catch (err) {
    // ignore cleanup errors
  }
};

const exportDepartments = async (organizationId) => {
  const departments = await Department.findAll({
    where: { organization_id: organizationId },
    include: [
      {
        model: OrganizationMember,
        as: 'headMember',
        include: [{ model: User, as: 'user', attributes: ['email'] }],
      },
      { model: Department, as: 'parentDepartment', attributes: ['name'] },
    ],
    order: [['name', 'ASC']],
  });

  return departments.map((department) => ({
    name: department.name,
    status: department.status,
    head_email: department.headMember?.user?.email || '',
    parent_department: department.parentDepartment?.name || '',
  }));
};

const exportMembers = async (organizationId) => {
  const members = await OrganizationMember.findAll({
    where: { organization_id: organizationId },
    include: [
      { model: User, as: 'user', attributes: ['email', 'first_name', 'last_name'] },
      { model: Department, as: 'department', attributes: ['name'] },
      { model: Team, as: 'team', attributes: ['name'] },
      { model: Position, as: 'position', attributes: ['name'] },
      { model: OrgRole, as: 'orgRole', attributes: ['name'] },
      {
        model: OrganizationMember,
        as: 'manager',
        include: [{ model: User, as: 'user', attributes: ['email'] }],
      },
    ],
    order: [['created_at', 'ASC']],
  });

  return members.map((member) => ({
    email: member.user?.email || '',
    first_name: member.user?.first_name || '',
    last_name: member.user?.last_name || '',
    department: member.department?.name || '',
    team: member.team?.name || '',
    position: member.position?.name || '',
    role: member.orgRole?.name || '',
    status: member.status,
    reports_to_email: member.manager?.user?.email || '',
  }));
};

const headersByEntity = {
  departments: ['name', 'status', 'head_email', 'parent_department'],
  members: ['email', 'first_name', 'last_name', 'department', 'team', 'position', 'role', 'status', 'reports_to_email'],
};

const importExportController = {
  async exportData(req, res) {
    try {
      const entity = String(req.query.entity || '').toLowerCase();
      const format = String(req.query.format || 'csv').toLowerCase();
      if (!VALID_ENTITIES.includes(entity) || !VALID_FORMATS.includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid entity or format',
        });
      }

      const rows =
        entity === 'departments'
          ? await exportDepartments(req.organizationId)
          : await exportMembers(req.organizationId);
      const headers = headersByEntity[entity];
      const buffer = format === 'csv' ? buildCsvBuffer(rows, headers) : buildXlsxBuffer(rows, headers);
      const filename = `${entity}-export-${new Date().toISOString().slice(0, 10)}.${format}`;

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to export data',
        error: error.message,
      });
    }
  },

  async downloadTemplate(req, res) {
    try {
      const entity = String(req.query.entity || '').toLowerCase();
      const format = String(req.query.format || 'csv').toLowerCase();
      if (!VALID_ENTITIES.includes(entity) || !VALID_FORMATS.includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid entity or format',
        });
      }

      const rows = buildTemplateRows(entity);
      const headers = headersByEntity[entity];
      const buffer = format === 'csv' ? buildCsvBuffer(rows, headers) : buildXlsxBuffer(rows, headers);
      const filename = `${entity}-template.${format}`;

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate import template',
        error: error.message,
      });
    }
  },

  async importData(req, res) {
    const filePath = req.file?.path;
    try {
      const entity = String(req.query.entity || '').toLowerCase();
      if (!VALID_ENTITIES.includes(entity)) {
        safeUnlink(filePath);
        return res.status(400).json({
          success: false,
          message: 'Invalid entity',
        });
      }
      if (!filePath) {
        return res.status(400).json({
          success: false,
          message: 'File is required',
        });
      }

      const extension = path.extname(filePath).toLowerCase();
      const format = extension === '.csv' ? 'csv' : 'xlsx';
      const rows = parseImportFile(filePath);

      const importJob = await ImportJob.create({
        organization_id: req.organizationId,
        entity,
        format,
        status: 'processing',
        total_rows: rows.length,
        success_rows: 0,
        failed_rows: 0,
        uploaded_by: req.user.id,
        report: {},
      });

      let successRows = 0;
      let failedRows = 0;
      const results = [];
      const pendingManagerLinks = [];
      const memberByEmail = new Map();

      if (entity === 'departments') {
        for (const row of rows) {
          const name = String(row.name || '').trim();
          if (!name) {
            failedRows += 1;
            results.push({ row, success: false, error: 'name is required' });
            continue;
          }

          try {
            let headMemberId = null;
            if (row.head_email) {
              const headUser = await User.findOne({
                where: { email: String(row.head_email).trim().toLowerCase() },
              });
              if (headUser) {
                const headMember = await OrganizationMember.findOne({
                  where: {
                    organization_id: req.organizationId,
                    user_id: headUser.id,
                  },
                });
                headMemberId = headMember?.id || null;
              }
            }

            let parentDepartmentId = null;
            if (row.parent_department) {
              const parent = await Department.findOne({
                where: {
                  organization_id: req.organizationId,
                  name: String(row.parent_department).trim(),
                },
              });
              parentDepartmentId = parent?.id || null;
            }

            const [department, created] = await Department.findOrCreate({
              where: {
                organization_id: req.organizationId,
                name,
              },
              defaults: {
                organization_id: req.organizationId,
                name,
                status: normalizeStatus(row.status, 'active'),
                head_member_id: headMemberId,
                parent_department_id: parentDepartmentId,
              },
            });

            if (!created) {
              await department.update({
                status: normalizeStatus(row.status, department.status),
                head_member_id: headMemberId,
                parent_department_id: parentDepartmentId,
              });
            }

            successRows += 1;
            results.push({ row, success: true, id: department.id, action: created ? 'created' : 'updated' });
          } catch (rowError) {
            failedRows += 1;
            results.push({ row, success: false, error: rowError.message });
          }
        }
      } else {
        for (const row of rows) {
          const email = String(row.email || '').trim().toLowerCase();
          if (!email) {
            failedRows += 1;
            results.push({ row, success: false, error: 'email is required' });
            continue;
          }

          try {
            const firstName = String(row.first_name || row.firstname || '').trim();
            const lastName = String(row.last_name || row.lastname || '').trim();

            let user = await User.findOne({ where: { email } });
            if (!user) {
              user = await User.create({
                email,
                password: crypto.randomBytes(16).toString('hex'),
                first_name: firstName,
                last_name: lastName,
                verification_token: generateInviteToken(),
              });
            } else {
              await user.update({
                first_name: firstName || user.first_name,
                last_name: lastName || user.last_name,
              });
            }

            const [department] = await Promise.all([
              row.department
                ? Department.findOne({
                    where: { organization_id: req.organizationId, name: String(row.department).trim() },
                  })
                : Promise.resolve(null),
            ]);

            let team = null;
            if (row.team) {
              team = await Team.findOne({
                where: { organization_id: req.organizationId, name: String(row.team).trim() },
              });
              if (!team && department) {
                team = await Team.create({
                  organization_id: req.organizationId,
                  department_id: department.id,
                  name: String(row.team).trim(),
                });
              }
            }

            let position = null;
            if (row.position) {
              const positionName = String(row.position).trim();
              [position] = await Position.findOrCreate({
                where: { organization_id: req.organizationId, name: positionName },
                defaults: {
                  organization_id: req.organizationId,
                  name: positionName,
                  is_active: true,
                },
              });
            }

            let orgRole = null;
            if (row.role) {
              const roleName = String(row.role).trim();
              [orgRole] = await OrgRole.findOrCreate({
                where: { organization_id: req.organizationId, name: roleName },
                defaults: {
                  organization_id: req.organizationId,
                  name: roleName,
                  permissions: [],
                  is_system: false,
                  is_active: true,
                },
              });
            }

            const [member, created] = await OrganizationMember.findOrCreate({
              where: {
                organization_id: req.organizationId,
                user_id: user.id,
              },
              defaults: {
                organization_id: req.organizationId,
                user_id: user.id,
                department_id: department?.id || null,
                team_id: team?.id || null,
                position_id: position?.id || null,
                org_role_id: orgRole?.id || null,
                status: normalizeStatus(row.status, 'pending_invite'),
                invited_by: req.user.id,
                invited_at: new Date(),
              },
            });

            if (!created) {
              await member.update({
                department_id: department?.id || member.department_id,
                team_id: team?.id || member.team_id,
                position_id: position?.id || member.position_id,
                org_role_id: orgRole?.id || member.org_role_id,
                status: normalizeStatus(row.status, member.status),
              });
            }

            if (member.team_id) {
              await TeamMember.findOrCreate({
                where: {
                  organization_id: req.organizationId,
                  team_id: member.team_id,
                  organization_member_id: member.id,
                },
                defaults: {
                  organization_id: req.organizationId,
                  team_id: member.team_id,
                  organization_member_id: member.id,
                },
              });
            }

            await Invitation.create({
              organization_id: req.organizationId,
              email,
              status: 'pending',
              invite_token: generateInviteToken(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              invited_by: req.user.id,
              metadata: { memberId: member.id },
            });

            memberByEmail.set(email, member);
            if (row.reports_to_email) {
              pendingManagerLinks.push({
                memberId: member.id,
                managerEmail: String(row.reports_to_email).trim().toLowerCase(),
              });
            }

            successRows += 1;
            results.push({ row, success: true, id: member.id, action: created ? 'created' : 'updated' });
          } catch (rowError) {
            failedRows += 1;
            results.push({ row, success: false, error: rowError.message });
          }
        }

        for (const link of pendingManagerLinks) {
          const manager = memberByEmail.get(link.managerEmail);
          if (!manager) continue;
          await OrganizationMember.update(
            { reports_to_member_id: manager.id },
            { where: { id: link.memberId, organization_id: req.organizationId } }
          );
        }
      }

      await importJob.update({
        status: failedRows ? 'completed_with_errors' : 'completed',
        success_rows: successRows,
        failed_rows: failedRows,
        report: { results },
      });

      await logOrgAudit({
        organizationId: req.organizationId,
        actorUserId: req.user.id,
        entityType: 'import',
        entityId: importJob.id,
        action: 'completed',
        message: `Import completed for ${entity} (${successRows} success, ${failedRows} failed)`,
        newValues: importJob.toJSON(),
      });

      safeUnlink(filePath);

      res.status(201).json({
        success: true,
        data: {
          importJobId: importJob.id,
          totalRows: rows.length,
          successRows,
          failedRows,
          results,
        },
        message: 'Import completed',
      });
    } catch (error) {
      safeUnlink(filePath);
      res.status(500).json({
        success: false,
        message: 'Failed to import file',
        error: error.message,
      });
    }
  },
};

module.exports = importExportController;

