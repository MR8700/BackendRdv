'use strict';

const { Service, Clinique, Medecin, Utilisateur } = require('../models');
const { ok, created, paginated, notFound } = require('../utils/response.util');
const { AppError }    = require('../middlewares/errorHandler.middleware');
const { replaceFile } = require('../services/upload.service');
const { auditManual } = require('../middlewares/audit.middleware');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { count, rows } = await Service.findAndCountAll({
      include: [{ model: Clinique, as: 'clinique', attributes: ['nom'] }],
      order  : [['nom_service', 'ASC']],
      limit  : parseInt(limit, 10),
      offset : (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const service = await Service.findByPk(req.params.id_service, {
      include: [
        { model: Clinique, as: 'clinique', attributes: ['nom'] },
        { model: Medecin,  as: 'medecins',
          include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['nom', 'prenom'] }] },
      ],
    });
    if (!service) return notFound(res, 'Service');
    return ok(res, service);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { nom_service, description, id_clinique } = req.body;
    const image_path = req.file ? req.file.path.replace(/\\/g, '/') : null;
    const service = await Service.create({ nom_service, description, id_clinique, image_path });
    await auditManual(req, 'CREATE_SERVICE', 'services', { id_service: service.id_service });
    return created(res, service, 'Service créé.');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const service = await Service.findByPk(req.params.id_service);
    if (!service) return notFound(res, 'Service');
    const { nom_service, description, id_clinique } = req.body;
    await service.update({ nom_service, description, id_clinique });
    await auditManual(req, 'UPDATE_SERVICE', 'services', { id_service: service.id_service });
    return ok(res, service, 'Service mis à jour.');
  } catch (err) { next(err); }
}

async function updateImage(req, res, next) {
  try {
    const service = await Service.findByPk(req.params.id_service);
    if (!service) return notFound(res, 'Service');
    if (!req.file) throw new AppError('Aucun fichier fourni.', 400, 'NO_FILE');
    const newPath = replaceFile(req, service.image_path);
    await service.update({ image_path: newPath });
    return ok(res, { image_path: newPath }, 'Image mise à jour.');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const service = await Service.findByPk(req.params.id_service);
    if (!service) return notFound(res, 'Service');
    await auditManual(req, 'DELETE_SERVICE', 'services', { id_service: service.id_service });
    await service.destroy();
    return ok(res, null, 'Service supprimé.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, create, update, updateImage, remove };