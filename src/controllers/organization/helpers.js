const crypto = require('crypto');
const { Op } = require('sequelize');

const getPagination = (query = {}, defaultLimit = 10, maxLimit = 100) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const toDisplayName = (user) => {
  if (!user) return '';
  return (
    user.display_name ||
    `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
    user.email ||
    ''
  );
};

const normalizeStatus = (value, fallback = 'active') => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (['active', 'inactive', 'pending_invite', 'deactivated'].includes(raw)) return raw;
  return fallback;
};

const buildSearchWhere = (search, fields = []) => {
  if (!search || !fields.length) return {};
  return {
    [Op.or]: fields.map((field) => ({
      [field]: { [Op.iLike]: `%${search}%` },
    })),
  };
};

const generateInviteToken = () => crypto.randomBytes(24).toString('hex');

module.exports = {
  getPagination,
  toDisplayName,
  normalizeStatus,
  buildSearchWhere,
  generateInviteToken,
};

