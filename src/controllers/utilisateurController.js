'use strict';

const { Utilisateur, Role, Medecin, Patient, Secretaire, Administrateur, Service } = require('../models');
const { hashPassword } = require('../utils/hash.util');
const { generateDossierId } = require('../utils/uuid.util');
const { replaceFile } = require('../services/upload.service');
const { ok, created, paginated, notFound } = require('../utils/response.util');
const { AppError } = require('../middlewares/errorHandler.middleware');
const { STATUT_USER, TYPE_USER } = require('../utils/constants.util');
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
    const { page = 1, limit = 20, type_user, statut } = req.query;
    const where = {};
    if (type_user) where.type_user = type_user;
    if (statut) where.statut = statut;

    const { count, rows } = await Utilisateur.findAndCountAll({
      where,
      include: [{ model: Role, as: 'role' }],
      order: [['nom', 'ASC']],
      limit: parseInt(limit, 10),
      offset: (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const user = await Utilisateur.findByPk(req.params.id_user, {
      include: [
        { model: Role, as: 'role' },
        { model: Medecin, as: 'profil_medecin' },
        { model: Patient, as: 'profil_patient' },
        {
          model: Secretaire,
          as: 'profil_secretaire',
          include: [{ model: Service, as: 'services_affectes', through: { attributes: [] } }],
        },
        { model: Administrateur, as: 'profil_administrateur' },
      ],
    });
    if (!user) return notFound(res, 'Utilisateur');
    return ok(res, user);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const {
      password,
      type_user,
      code_rpps,
      specialite_principale,
      id_service_affecte,
      id_services_affectes,
      niveau_acces,
      num_secu_sociale,
      groupe_sanguin,
      ...userData
    } = req.body;

    userData.password_hash = await hashPassword(password);
    userData.type_user = type_user;

    const user = await Utilisateur.create(userData);

    switch (type_user) {
      case TYPE_USER.MEDECIN:
        await Medecin.create({ id_user: user.id_user, code_rpps, specialite_principale });
        break;
      case TYPE_USER.SECRETAIRE: {
        const secretary = await Secretaire.create({ id_user: user.id_user, id_service_affecte: id_service_affecte || null });
        const serviceIds = normalizeSecretaryServiceIds({ id_service_affecte, id_services_affectes });
        if (serviceIds.length > 0) {
          const services = await Service.findAll({ where: { id_service: serviceIds } });
          await secretary.setServices_affectes(services);
          await secretary.update({ id_service_affecte: serviceIds[0] });
        }
        break;
      }
      case TYPE_USER.ADMINISTRATEUR:
        await Administrateur.create({ id_user: user.id_user, niveau_acces: niveau_acces || 1 });
        break;
      case TYPE_USER.PATIENT:
        await Patient.create({
          id_user: user.id_user,
          num_secu_sociale,
          groupe_sanguin,
          id_dossier_medical: generateDossierId(),
        });
        break;
    }

    await auditManual(req, 'CREATE_USER', 'utilisateurs', { id_user: user.id_user, type_user });
    return created(res, { id_user: user.id_user }, 'Utilisateur créé.');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const user = await Utilisateur.findByPk(req.params.id_user, {
      include: [
        { model: Medecin, as: 'profil_medecin' },
        { model: Patient, as: 'profil_patient' },
        { model: Secretaire, as: 'profil_secretaire' },
        { model: Administrateur, as: 'profil_administrateur' },
      ],
    });
    if (!user) return notFound(res, 'Utilisateur');

    const {
      code_rpps,
      specialite_principale,
      id_service_affecte,
      id_services_affectes,
      niveau_acces,
      num_secu_sociale,
      groupe_sanguin,
      ...userData
    } = req.body;

    await user.update(userData);

    if (user.type_user === TYPE_USER.MEDECIN && user.profil_medecin) {
      await user.profil_medecin.update({
        ...(code_rpps !== undefined ? { code_rpps } : {}),
        ...(specialite_principale !== undefined ? { specialite_principale } : {}),
      });
    }

    if (user.type_user === TYPE_USER.SECRETAIRE && user.profil_secretaire) {
      const serviceIds = normalizeSecretaryServiceIds({ id_service_affecte, id_services_affectes });
      const primaryServiceId =
        id_service_affecte !== undefined
          ? (id_service_affecte || null)
          : (serviceIds[0] ?? user.profil_secretaire.id_service_affecte ?? null);

      if (id_service_affecte !== undefined || id_services_affectes !== undefined) {
        const services = serviceIds.length > 0
          ? await Service.findAll({ where: { id_service: serviceIds } })
          : [];
        await user.profil_secretaire.setServices_affectes(services);
      }

      await user.profil_secretaire.update({ id_service_affecte: primaryServiceId });
    }

    if (user.type_user === TYPE_USER.ADMINISTRATEUR && user.profil_administrateur && niveau_acces !== undefined) {
      await user.profil_administrateur.update({ niveau_acces });
    }

    if (user.type_user === TYPE_USER.PATIENT && user.profil_patient) {
      await user.profil_patient.update({
        ...(num_secu_sociale !== undefined ? { num_secu_sociale: num_secu_sociale || null } : {}),
        ...(groupe_sanguin !== undefined ? { groupe_sanguin: groupe_sanguin || null } : {}),
      });
    }

    await auditManual(req, 'UPDATE_USER', 'utilisateurs', { id_user: user.id_user });
    return ok(res, user, 'Utilisateur mis à jour.');
  } catch (err) { next(err); }
}

async function archive(req, res, next) {
  try {
    const user = await Utilisateur.findByPk(req.params.id_user);
    if (!user) return notFound(res, 'Utilisateur');
    if (user.statut === STATUT_USER.ARCHIVE) {
      throw new AppError('Utilisateur déjà archivé.', 409, 'ALREADY_ARCHIVED');
    }
    await user.update({ statut: STATUT_USER.ARCHIVE, date_archivage: new Date() });
    await auditManual(req, 'ARCHIVE_USER', 'utilisateurs', { id_user: user.id_user });
    return ok(res, null, 'Utilisateur archivé.');
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    const { comparePassword: cmp } = require('../utils/hash.util');
    const user = await Utilisateur.scope('withPassword').findByPk(req.params.id_user);
    if (!user) return notFound(res, 'Utilisateur');

    const valid = await cmp(req.body.ancien_password, user.password_hash);
    if (!valid) throw new AppError('Ancien mot de passe incorrect.', 401, 'WRONG_PASSWORD');

    await user.update({ password_hash: await hashPassword(req.body.nouveau_password) });
    await auditManual(req, 'CHANGE_PASSWORD', 'utilisateurs', { id_user: user.id_user });
    return ok(res, null, 'Mot de passe mis à jour.');
  } catch (err) { next(err); }
}

async function updatePhoto(req, res, next) {
  try {
    const user = await Utilisateur.findByPk(req.params.id_user);
    if (!user) return notFound(res, 'Utilisateur');
    const newPath = replaceFile(req, user.photo_path);
    await user.update({ photo_path: newPath });
    return ok(res, { photo_path: newPath }, 'Photo mise à jour.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, create, update, archive, changePassword, updatePhoto };
