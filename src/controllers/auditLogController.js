'use strict';

const auditService = require('../services/audit.service');
const { ok, paginated } = require('../utils/response.util');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 50, table_nom } = req.query;
    const { count, rows } = await auditService.getAll({ page, limit, table_nom });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getByUser(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { count, rows } = await auditService.getByUser(req.params.id_user, { page, limit });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

module.exports = { getAll, getByUser };