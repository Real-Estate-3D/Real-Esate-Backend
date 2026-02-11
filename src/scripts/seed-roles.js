const { Role, sequelize } = require('../models');
const { normalizePermissionMatrix } = require('../utils/permissionMatrix');

const roles = [
  {
    name: 'admin',
    description: 'Full system access with all permissions',
    permissions: normalizePermissionMatrix('*')
  },
  {
    name: 'city_official',
    description: 'City official with approval permissions',
    permissions: normalizePermissionMatrix({
      mapping_zoning: { view: true, edit: true },
      legislation: { view: true, edit: true },
      organization_management: { view: true, edit: true },
      approvals: { view: true, edit: true },
      data_management: { view: true, edit: false },
      accounting: { view: true, edit: false },
    })
  },
  {
    name: 'planner',
    description: 'City planner who can manage projects and workflows',
    permissions: normalizePermissionMatrix({
      mapping_zoning: { view: true, edit: true },
      legislation: { view: true, edit: true },
      organization_management: { view: true, edit: false },
      approvals: { view: true, edit: false },
      data_management: { view: true, edit: true },
      accounting: { view: true, edit: false },
    })
  },
  {
    name: 'viewer',
    description: 'Read-only access to view information',
    permissions: normalizePermissionMatrix({
      mapping_zoning: { view: true, edit: false },
      legislation: { view: true, edit: false },
      organization_management: { view: true, edit: false },
      approvals: { view: true, edit: false },
      data_management: { view: true, edit: false },
      accounting: { view: true, edit: false },
    })
  },
  {
    name: 'user',
    description: 'Default user role with basic permissions',
    permissions: normalizePermissionMatrix({
      mapping_zoning: { view: true, edit: false },
      legislation: { view: true, edit: false },
      organization_management: { view: false, edit: false },
      approvals: { view: false, edit: false },
      data_management: { view: false, edit: false },
      accounting: { view: false, edit: false },
    })
  }
];

const seedRoles = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    for (const roleData of roles) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: roleData
      });

      if (created) {
        console.log(`✓ Created role: ${roleData.name}`);
      } else {
        console.log(`ℹ Role already exists: ${roleData.name}`);
      }
    }

    console.log('✓ Role seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Role seeding failed:', error);
    process.exit(1);
  }
};

seedRoles();
