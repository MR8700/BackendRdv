'use strict';

const {
  Utilisateur,
  Role,
  Medecin,
  Patient,
  Secretaire,
  Administrateur,
  Service,
  sequelize,
} = require('../models');

const { hashPassword } = require('../utils/hash.util');
const { generateDossierId } = require('../utils/uuid.util');
const { replaceFile } = require('../services/upload.service');
const { ok, created, paginated, notFound } = require('../utils/response.util');
const { AppError } = require('../middlewares/errorHandler.middleware');
const { STATUT_USER, TYPE_USER } = require('../utils/constants.util');
const { auditManual } = require('../middlewares/audit.middleware');
const { Op } = require('sequelize');

/* =========================
   UTILS
========================= */
function normalizeSecretaryServiceIds(payload = {}) {
  const values = Array.isArray(payload.id_services_affectes)
    ? [...payload.id_services_affectes]
    : [];

  if (payload.id_service_affecte && !values.includes(payload.id_service_affecte)) {
    values.push(payload.id_service_affecte);
  }

  return values
    .map(Number)
    .filter((v, i, arr) => Number.isInteger(v) && v > 0 && arr.indexOf(v) === i);
}

/* =========================
   GET ALL USERS
========================= */
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
      limit: Number(limit),
      offset: (page - 1) * limit,
    });

    return paginated(res, rows, count, page, limit);
  } catch (err) {
    next(err);
  }
}

/* =========================
   GET ONE USER
========================= */
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
          include: [
            { model: Service, as: 'services_affectes', through: { attributes: [] } },
          ],
        },
        { model: Administrateur, as: 'profil_administrateur' },
      ],
    });

    if (!user) return notFound(res, 'Utilisateur');
    return ok(res, user);
  } catch (err) {
    next(err);
  }
}

/* =========================
   CREATE USER
========================= */
async function create(req, res, next) {
  const transaction = await sequelize.transaction();

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

    if (!password) {
      throw new AppError('Mot de passe requis.', 400, 'MISSING_PASSWORD');
    }

    userData.password_hash = await hashPassword(password);
    userData.type_user = type_user;

    const user = await Utilisateur.create(userData, { transaction });

    switch (type_user) {
      case TYPE_USER.MEDECIN:
        await Medecin.create(
          { id_user: user.id_user, code_rpps, specialite_principale },
          { transaction }
        );
        break;

      case TYPE_USER.SECRETAIRE: {
        const secretary = await Secretaire.create(
          {
            id_user: user.id_user,
            id_service_affecte: id_service_affecte || null,
          },
          { transaction }
        );

        const serviceIds = normalizeSecretaryServiceIds({
          id_service_affecte,
          id_services_affectes,
        });

        if (serviceIds.length > 0) {
          const services = await Service.findAll({
            where: { id_service: { [Op.in]: serviceIds } },
          });

          await secretary.setServices_affectes(services, { transaction });
          await secretary.update(
            { id_service_affecte: serviceIds[0] },
            { transaction }
          );
        }
        break;
      }

      case TYPE_USER.ADMINISTRATEUR:
        await Administrateur.create(
          {
            id_user: user.id_user,
            niveau_acces: niveau_acces || 1,
          },
          { transaction }
        );
        break;

      case TYPE_USER.PATIENT:
        await Patient.create(
          {
            id_user: user.id_user,
            num_secu_sociale,
            groupe_sanguin,
            id_dossier_medical: generateDossierId(),
          },
          { transaction }
        );
        break;
    }

    await transaction.commit();

    await auditManual(req, 'CREATE_USER', 'utilisateurs', {
      id_user: user.id_user,
      type_user,
    });

    return created(res, { id_user: user.id_user }, 'Utilisateur créé.');
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

/* =========================
   UPDATE USER
========================= */
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

    /* MEDIC */
    if (user.type_user === TYPE_USER.MEDECIN && user.profil_medecin) {
      await user.profil_medecin.update({
        ...(code_rpps !== undefined && { code_rpps }),
        ...(specialite_principale !== undefined && { specialite_principale }),
      });
    }

    /* SECRETARY */
    if (user.type_user === TYPE_USER.SECRETAIRE && user.profil_secretaire) {
      const serviceIds = normalizeSecretaryServiceIds({
        id_service_affecte,
        id_services_affectes,
      });

      const primaryServiceId =
        id_service_affecte !== undefined
          ? id_service_affecte || null
          : serviceIds[0] ?? user.profil_secretaire.id_service_affecte ?? null;

      if (id_service_affecte !== undefined || id_services_affectes !== undefined) {
        const services = serviceIds.length
          ? await Service.findAll({
              where: { id_service: { [Op.in]: serviceIds } },
            })
          : [];

        await user.profil_secretaire.setServices_affectes(services);
      }

      await user.profil_secretaire.update({
        id_service_affecte: primaryServiceId,
      });
    }

    /* ADMIN */
    if (user.type_user === TYPE_USER.ADMINISTRATEUR && niveau_acces !== undefined) {
      await user.profil_administrateur?.update({ niveau_acces });
    }

    /* PATIENT */
    if (user.type_user === TYPE_USER.PATIENT && user.profil_patient) {
      await user.profil_patient.update({
        ...(num_secu_sociale !== undefined && { num_secu_sociale }),
        ...(groupe_sanguin !== undefined && { groupe_sanguin }),
      });
    }

    await auditManual(req, 'UPDATE_USER', 'utilisateurs', {
      id_user: user.id_user,
    });

    return ok(res, user, 'Utilisateur mis à jour.');
  } catch (err) {
    next(err);
  }
}

/* =========================
   ARCHIVE USER
========================= */
async function archive(req, res, next) {
  try {
    const user = await Utilisateur.findByPk(req.params.id_user);
    if (!user) return notFound(res, 'Utilisateur');

    if (user.statut === STATUT_USER.ARCHIVE) {
      throw new AppError('Utilisateur déjà archivé.', 409, 'ALREADY_ARCHIVED');
    }

    await user.update({
      statut: STATUT_USER.ARCHIVE,
      date_archivage: new Date(),
    });

    await auditManual(req, 'ARCHIVE_USER', 'utilisateurs', {
      id_user: user.id_user,
    });

    return ok(res, null, 'Utilisateur archivé.');
  } catch (err) {
    next(err);
  }
}

/* =========================
   CHANGE PASSWORD
========================= */
async function changePassword(req, res, next) {
  try {
    const { comparePassword } = require('../utils/hash.util');

    const user = await Utilisateur.scope('withPassword').findByPk(
      req.params.id_user
    );

    if (!user) return notFound(res, 'Utilisateur');

    const valid = await comparePassword(
      req.body.ancien_password,
      user.password_hash
    );

    if (!valid) {
      throw new AppError('Ancien mot de passe incorrect.', 401, 'WRONG_PASSWORD');
    }

    if (!req.body.nouveau_password || req.body.nouveau_password.length < 6) {
      throw new AppError('Mot de passe trop faible.', 400, 'WEAK_PASSWORD');
    }

    await user.update({
      password_hash: await hashPassword(req.body.nouveau_password),
    });

    await auditManual(req, 'CHANGE_PASSWORD', 'utilisateurs', {
      id_user: user.id_user,
    });

    return ok(res, null, 'Mot de passe mis à jour.');
  } catch (err) {
    next(err);
  }
}

/* =========================
   UPDATE PHOTO
========================= */
async function updatePhoto(req, res, next) {
  try {
    const user = await Utilisateur.findByPk(req.params.id_user);
    if (!user) return notFound(res, 'Utilisateur');

    if (!req.file) {
      throw new AppError('Aucune image envoyée.', 400, 'NO_FILE');
    }

    const newPath = replaceFile(req, user.photo_path);

    await user.update({ photo_path: newPath });

    return ok(res, { photo_path: newPath }, 'Photo mise à jour.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  archive,
  changePassword,
  updatePhoto,
};