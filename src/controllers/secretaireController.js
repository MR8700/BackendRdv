'use strict';

const { Secretaire, Utilisateur, Service } = require('../models');
const { ok, paginated, notFound } = require('../utils/response.util');
const { auditManual } = require('../middlewares/audit.middleware');

function normalizeSecretaryServiceIds(payload = {}) {
  const values = Array.isArray(payload.id_services_affectes) ? [...payload.id_services_affectes] : [];
  if (payload.id_service_affecte && !values.includes(payload.id_service_affecte)) {
    values.push(payload.id_service_affecte);
  }

  return values
    .map((value) => Number(value))
    .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);
}

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { count, rows } = await Secretaire.findAndCountAll({
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id_user', 'nom', 'prenom', 'email', 'statut'] },
        { model: Service, as: 'service_affecte', attributes: ['nom_service', 'id_service'] },
        { model: Service, as: 'services_affectes', attributes: ['id_service', 'nom_service'], through: { attributes: [] } },
      ],
      order: [[{ model: Utilisateur, as: 'utilisateur' }, 'nom', 'ASC']],
      limit: parseInt(limit, 10),
      offset: (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const sec = await Secretaire.findByPk(req.params.id_user, {
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id_user', 'nom', 'prenom', 'email', 'statut'] },
        { model: Service, as: 'service_affecte', attributes: ['nom_service'] },
        { model: Service, as: 'services_affectes', attributes: ['id_service', 'nom_service'], through: { attributes: [] } },
      ],
    });
    if (!sec) return notFound(res, 'Secretaire');
    return ok(res, sec);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const sec = await Secretaire.findByPk(req.params.id_user);
    if (!sec) return notFound(res, 'Secretaire');

    const serviceIds = normalizeSecretaryServiceIds(req.body);

    if (serviceIds.length > 0) {
      const services = await Service.findAll({ where: { id_service: serviceIds } });
      await sec.setServices_affectes(services);
      await sec.update({ id_service_affecte: serviceIds[0] });
    } else {
      await sec.setServices_affectes([]);
      await sec.update({ id_service_affecte: null });
    }

    await auditManual(req, 'UPDATE_SECRETAIRE', 'secretaires', { id_user: sec.id_user });
    return ok(res, sec, 'Profil secretaire mis a jour.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, update };
