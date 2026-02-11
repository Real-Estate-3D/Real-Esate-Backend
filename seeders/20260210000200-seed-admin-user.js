'use strict';

const bcrypt = require('bcryptjs');

const DEFAULT_ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@blueprint.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
  firstName: process.env.SEED_ADMIN_FIRST_NAME || 'System',
  lastName: process.env.SEED_ADMIN_LAST_NAME || 'Admin',
};

const ADMIN_ROLE = {
  name: 'admin',
  displayName: 'Administrator',
  description: 'Full system access with all permissions',
  permissions: [
    'user.read',
    'user.create',
    'user.update',
    'user.delete',
    'legislation.read',
    'legislation.create',
    'legislation.update',
    'legislation.delete',
    'workflow.read',
    'workflow.create',
    'workflow.update',
    'workflow.delete',
    'system.admin',
  ],
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const email = String(DEFAULT_ADMIN.email).trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(String(DEFAULT_ADMIN.password), 12);
    const displayName = `${DEFAULT_ADMIN.firstName} ${DEFAULT_ADMIN.lastName}`.trim();

    await queryInterface.sequelize.query(
      `
        INSERT INTO public.roles
          (name, display_name, description, permissions, is_system, level, created_at, updated_at)
        VALUES
          (:name, :displayName, :description, CAST(:permissions AS jsonb), true, 100, :now, :now)
        ON CONFLICT (name) DO NOTHING;
      `,
      {
        replacements: {
          name: ADMIN_ROLE.name,
          displayName: ADMIN_ROLE.displayName,
          description: ADMIN_ROLE.description,
          permissions: JSON.stringify(ADMIN_ROLE.permissions),
          now,
        },
      }
    );

    const [adminRole] = await queryInterface.sequelize.query(
      `
        SELECT id
        FROM public.roles
        WHERE name = :name
        LIMIT 1;
      `,
      {
        replacements: { name: ADMIN_ROLE.name },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (!adminRole?.id) {
      throw new Error('Admin role could not be created or resolved during seeding');
    }

    await queryInterface.sequelize.query(
      `
        INSERT INTO public.users
          (email, password, first_name, last_name, display_name, is_active, is_verified, login_count, preferences, metadata, created_at, updated_at)
        VALUES
          (:email, :password, :firstName, :lastName, :displayName, true, true, 0, '{}'::jsonb, '{}'::jsonb, :now, :now)
        ON CONFLICT (email) DO NOTHING;
      `,
      {
        replacements: {
          email,
          password: hashedPassword,
          firstName: DEFAULT_ADMIN.firstName,
          lastName: DEFAULT_ADMIN.lastName,
          displayName,
          now,
        },
      }
    );

    const [adminUser] = await queryInterface.sequelize.query(
      `
        SELECT id
        FROM public.users
        WHERE email = :email
        LIMIT 1;
      `,
      {
        replacements: { email },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (!adminUser?.id) {
      throw new Error('Admin user could not be created or resolved during seeding');
    }

    await queryInterface.sequelize.query(
      `
        INSERT INTO public.user_roles
          (user_id, role_id, granted_by, created_at, updated_at)
        VALUES
          (:userId, :roleId, :userId, :now, :now)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      `,
      {
        replacements: {
          userId: adminUser.id,
          roleId: adminRole.id,
          now,
        },
      }
    );
  },

  async down(queryInterface, Sequelize) {
    const email = String(DEFAULT_ADMIN.email).trim().toLowerCase();

    const [adminRole] = await queryInterface.sequelize.query(
      `
        SELECT id
        FROM public.roles
        WHERE name = :name
        LIMIT 1;
      `,
      {
        replacements: { name: ADMIN_ROLE.name },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    const [adminUser] = await queryInterface.sequelize.query(
      `
        SELECT id
        FROM public.users
        WHERE email = :email
        LIMIT 1;
      `,
      {
        replacements: { email },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (adminRole?.id && adminUser?.id) {
      await queryInterface.bulkDelete(
        { tableName: 'user_roles', schema: 'public' },
        { user_id: adminUser.id, role_id: adminRole.id }
      );
    }

    if (adminUser?.id) {
      await queryInterface.bulkDelete(
        { tableName: 'users', schema: 'public' },
        { id: adminUser.id }
      );
    }
  },
};
