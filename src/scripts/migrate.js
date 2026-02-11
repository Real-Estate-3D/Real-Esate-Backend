const { sequelize } = require('../models');
const config = require('../config');

const REQUIRED_SCHEMAS = [
  'reference',
  'boundaries',
  'infrastructure',
  'landuse',
  'legislation',
  'users',
  'organization',
];

const createSchemas = async () => {
  for (const schema of REQUIRED_SCHEMAS) {
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
  }
  console.log('✓ Database schemas verified/created');
};

const enablePostgis = async () => {
  if (sequelize.getDialect?.() !== 'postgres') {
    return;
  }

  try {
    await sequelize.query(
      'CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;'
    );
    console.log('✓ PostGIS extension verified/enabled');
  } catch (err) {
    const message = err?.message || String(err);
    console.error(
      '✗ PostGIS extension is required for GEOMETRY columns but could not be enabled.'
    );
    console.error('  - Ensure PostGIS is installed on the PostgreSQL server');
    console.error('  - Ensure the DB user can run: CREATE EXTENSION postgis');
    console.error(`  - Underlying error: ${message}`);
    throw err;
  }
};

const migrate = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');

    await enablePostgis();
    await createSchemas();

    await sequelize.sync({
      alter: { drop: false },
      force: false,
    });

    console.log('✓ Database schema synchronized successfully');
    console.log('✓ All tables and columns are up to date');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
