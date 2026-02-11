const path = require('path');

let XLSX = null;
try {
  XLSX = require('xlsx');
} catch (err) {
  XLSX = null;
}

const ensureXlsx = () => {
  if (!XLSX) {
    const error = new Error('XLSX dependency is missing. Install with: npm install xlsx');
    error.statusCode = 500;
    throw error;
  }
};

const toCellString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeKeys = (row) => {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    const safeKey = String(key || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w]/g, '_');
    if (safeKey) {
      normalized[safeKey] = typeof value === 'string' ? value.trim() : value;
    }
  });
  return normalized;
};

const parseImportFile = (filePath) => {
  ensureXlsx();
  const extension = path.extname(filePath).toLowerCase();
  if (!['.csv', '.xlsx', '.xls'].includes(extension)) {
    const error = new Error('Unsupported file format. Only CSV and XLSX are allowed.');
    error.statusCode = 400;
    throw error;
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rawRows.map(normalizeKeys);
};

const buildCsvBuffer = (rows = [], headers = []) => {
  const headerRow = headers.join(',');
  const dataRows = rows.map((row) =>
    headers
      .map((header) => {
        const value = toCellString(row[header]).replace(/"/g, '""');
        return `"${value}"`;
      })
      .join(',')
  );
  const csv = [headerRow, ...dataRows].join('\n');
  return Buffer.from(csv, 'utf8');
};

const buildXlsxBuffer = (rows = [], headers = []) => {
  ensureXlsx();
  const sheetRows = rows.map((row) => {
    const output = {};
    headers.forEach((header) => {
      output[header] = row[header] ?? '';
    });
    return output;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows, { header: headers });
  XLSX.utils.book_append_sheet(wb, ws, 'data');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

const buildTemplateRows = (entity) => {
  if (entity === 'departments') {
    return [
      {
        name: 'Planning Department',
        status: 'active',
        head_email: 'head@city.gov',
        parent_department: '',
      },
    ];
  }

  return [
    {
      email: 'planner@city.gov',
      first_name: 'Jane',
      last_name: 'Planner',
      department: 'Planning Department',
      team: 'Team 1',
      position: 'Planner',
      role: 'Planner',
      status: 'pending_invite',
      reports_to_email: '',
    },
  ];
};

module.exports = {
  parseImportFile,
  buildCsvBuffer,
  buildXlsxBuffer,
  buildTemplateRows,
};

