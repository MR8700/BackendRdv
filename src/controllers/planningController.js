'use strict';

const { Planning, Medecin, Service, Utilisateur, Disponibilite } = require('../models');
const { ok, created, paginated, notFound } = require('../utils/response.util');
const { auditManual } = require('../middlewares/audit.middleware');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, id_medecin, id_service } = req.query;
    const where = {};
    if (id_medecin) where.id_medecin = id_medecin;
    if (id_service) where.id_service = id_service;

    const { count, rows } = await Planning.findAndCountAll({
      where,
      include: [
        { model: Medecin,  as: 'medecin',  include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['nom', 'prenom'] }] },
        { model: Service,  as: 'service',  attributes: ['nom_service'] },
      ],
      order  : [['derniere_maj', 'DESC']],
      limit  : parseInt(limit, 10),
      offset : (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const planning = await Planning.findByPk(req.params.id_planning, {
      include: [
        { model: Medecin,       as: 'medecin',       include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['nom', 'prenom'] }] },
        { model: Service,       as: 'service',       attributes: ['nom_service'] },
        { model: Disponibilite, as: 'disponibilites' },
      ],
    });
    if (!planning) return notFound(res, 'Planning');
    return ok(res, planning);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const planning = await Planning.create(req.body);
    await auditManual(req, 'CREATE_PLANNING', 'plannings', { id_planning: planning.id_planning });
    return created(res, planning, 'Planning créé.');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const planning = await Planning.findByPk(req.params.id_planning);
    if (!planning) return notFound(res, 'Planning');
    await auditManual(req, 'DELETE_PLANNING', 'plannings', { id_planning: planning.id_planning });
    await planning.destroy();
    return ok(res, null, 'Planning supprimé.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, create, remove };