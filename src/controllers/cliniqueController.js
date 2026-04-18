'use strict';

const { Clinique, Service } = require('../models');
const { ok, notFound }  = require('../utils/response.util');
const { AppError }      = require('../middlewares/errorHandler.middleware');
const { replaceFile }   = require('../services/upload.service');
const { auditManual }   = require('../middlewares/audit.middleware');

async function get(req, res, next) {
  try {
    const clinique = await Clinique.findOne({
      include: [{ model: Service, as: 'services' }],
    });
    if (!clinique) return notFound(res, 'Clinique');
    return ok(res, clinique);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const clinique = await Clinique.findOne();
    if (!clinique) throw new AppError('Clinique non configurée.', 404, 'NOT_FOUND');
    const { nom, adresse, site_web } = req.body;
    await clinique.update({ nom, adresse, site_web });
    await auditManual(req, 'UPDATE_CLINIQUE', 'clinique', { id_clinique: clinique.id_clinique });
    return ok(res, clinique, 'Clinique mise à jour.');
  } catch (err) { next(err); }
}

async function updateLogo(req, res, next) {
  try {
    const clinique = await Clinique.findOne();
    if (!clinique) throw new AppError('Clinique non configurée.', 404, 'NOT_FOUND');
    if (!req.file)  throw new AppError('Aucun fichier fourni.', 400, 'NO_FILE');
    const newPath = replaceFile(req, clinique.logo_path);
    await clinique.update({ logo_path: newPath });
    return ok(res, { logo_path: newPath }, 'Logo mis à jour.');
  } catch (err) { next(err); }
}

module.exports = { get, update, updateLogo };