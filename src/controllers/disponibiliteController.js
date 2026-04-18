'use strict';

const { Op } = require('sequelize');
const { Disponibilite, Medecin, Service, Utilisateur, DelegationPermission, Permission } = require('../models');
const { ok, created, paginated, notFound } = require('../utils/response.util');
const { AppError } = require('../middlewares/errorHandler.middleware');
const { auditManual } = require('../middlewares/audit.middleware');

async function assertSecretaryCanManageDoctor(user, medecinId, requiredPermission = 'gerer_planning') {
  if (user.type_user !== 'secretaire') return;

  const delegation = await DelegationPermission.findOne({
    where: {
      id_medecin: Number(medecinId),
      id_secretaire: user.id_user,
    },
    include: [{
      model: Permission,
      as: 'permission',
      attributes: ['nom_permission'],
      where: { nom_permission: requiredPermission },
      required: true,
    }],
  });

  if (!delegation) {
    throw new AppError('Ce secretaire ne peut pas gerer les creneaux de ce medecin.', 403, 'SECRETARY_DISPO_FORBIDDEN');
  }
}

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 50, id_medecin, id_service, libre_seulement, date_debut, date_fin } = req.query;
    const where = {};
    if (id_medecin) where.id_medecin = id_medecin;
    if (id_service) where.id_service = id_service;
    if (libre_seulement === 'true') where.est_libre = true;
    if (date_debut || date_fin) {
      where.date_heure_debut = {};
      if (date_debut) where.date_heure_debut[Op.gte] = new Date(date_debut);
      if (date_fin) where.date_heure_debut[Op.lte] = new Date(date_fin);
    }

    const { count, rows } = await Disponibilite.findAndCountAll({
      where,
      include: [
        { model: Medecin, as: 'medecin', include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['nom', 'prenom'] }] },
        { model: Service, as: 'service', attributes: ['nom_service'] },
      ],
      order: [['date_heure_debut', 'ASC']],
      limit: parseInt(limit, 10),
      offset: (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const dispo = await Disponibilite.findByPk(req.params.id_dispo, {
      include: [
        { model: Medecin, as: 'medecin', include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['nom', 'prenom'] }] },
        { model: Service, as: 'service', attributes: ['nom_service'] },
      ],
    });
    if (!dispo) return notFound(res, 'Disponibilite');
    return ok(res, dispo);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { id_medecin, date_heure_debut, date_heure_fin, id_service, capacite_max } = req.body;

    if (req.user.type_user === 'medecin' && req.user.id_user !== Number(id_medecin)) {
      throw new AppError('Vous ne pouvez creer que vos propres creneaux.', 403, 'FORBIDDEN_OWN_DISPO_ONLY');
    }
    await assertSecretaryCanManageDoctor(req.user, id_medecin);

    const overlap = await Disponibilite.findOne({
      where: {
        id_medecin,
        [Op.or]: [
          { date_heure_debut: { [Op.between]: [date_heure_debut, date_heure_fin] } },
          { date_heure_fin: { [Op.between]: [date_heure_debut, date_heure_fin] } },
          {
            [Op.and]: [
              { date_heure_debut: { [Op.lte]: date_heure_debut } },
              { date_heure_fin: { [Op.gte]: date_heure_fin } },
            ],
          },
        ],
      },
    });
    if (overlap) throw new AppError('Chevauchement avec un creneau existant.', 409, 'SLOT_OVERLAP');

    const dispo = await Disponibilite.create({ id_medecin, date_heure_debut, date_heure_fin, id_service, capacite_max });
    await auditManual(req, 'CREATE_DISPO', 'disponibilites', { id_dispo: dispo.id_dispo, id_medecin });
    return created(res, dispo, 'Creneau de disponibilite cree.');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const dispo = await Disponibilite.findByPk(req.params.id_dispo);
    if (!dispo) return notFound(res, 'Disponibilite');

    if (req.user.type_user === 'medecin' && req.user.id_user !== dispo.id_medecin) {
      throw new AppError('Acces refuse.', 403, 'FORBIDDEN');
    }
    await assertSecretaryCanManageDoctor(req.user, dispo.id_medecin);

    const { date_heure_debut, date_heure_fin, capacite_max, id_service } = req.body;
    await dispo.update({ date_heure_debut, date_heure_fin, capacite_max, id_service });
    return ok(res, dispo, 'Creneau mis a jour.');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const dispo = await Disponibilite.findByPk(req.params.id_dispo);
    if (!dispo) return notFound(res, 'Disponibilite');
    if (req.user.type_user === 'medecin' && req.user.id_user !== dispo.id_medecin) {
      throw new AppError('Acces refuse.', 403, 'FORBIDDEN');
    }
    await assertSecretaryCanManageDoctor(req.user, dispo.id_medecin);
    await dispo.destroy();
    return ok(res, null, 'Creneau supprime.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, create, update, remove };
