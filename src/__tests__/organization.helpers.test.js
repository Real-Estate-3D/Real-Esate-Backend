const { buildCsvBuffer, buildTemplateRows } = require('../utils/importExport');
const { normalizeStatus, getPagination } = require('../controllers/organization/helpers');
const { isManagerRole } = require('../middleware/organizationAuth');

describe('organization utility helpers', () => {
  test('buildCsvBuffer includes header and quoted rows', () => {
    const buffer = buildCsvBuffer(
      [{ name: 'Planning', status: 'active' }],
      ['name', 'status']
    );
    const csv = buffer.toString('utf8');
    expect(csv).toContain('name,status');
    expect(csv).toContain('"Planning","active"');
  });

  test('buildTemplateRows returns member template', () => {
    const rows = buildTemplateRows('members');
    expect(rows[0]).toHaveProperty('email');
    expect(rows[0]).toHaveProperty('department');
    expect(rows[0]).toHaveProperty('role');
  });

  test('normalizeStatus validates known statuses', () => {
    expect(normalizeStatus('active', 'inactive')).toBe('active');
    expect(normalizeStatus('deactivated', 'active')).toBe('deactivated');
    expect(normalizeStatus('unknown', 'active')).toBe('active');
  });

  test('getPagination returns default and bounded values', () => {
    expect(getPagination({})).toEqual({ page: 1, limit: 10, offset: 0 });
    expect(getPagination({ page: '2', limit: '500' }, 10, 100)).toEqual({
      page: 2,
      limit: 100,
      offset: 100,
    });
  });

  test('isManagerRole checks admin and city_official', () => {
    expect(isManagerRole({ roles: [{ name: 'admin' }] })).toBe(true);
    expect(isManagerRole({ roles: [{ name: 'city_official' }] })).toBe(true);
    expect(isManagerRole({ roles: [{ name: 'viewer' }] })).toBe(false);
  });
});

