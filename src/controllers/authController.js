'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  Utilisateur,
  Role,
  Permission,
  Patient,
  Medecin,
  Secretaire,
  Service,
} = require('../models');
const { comparePassword, hashPassword } = require('../utils/hash.util');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../services/token.service');
const {
  loadUserWithPermissions,
  resolveEffectivePermissions,
  attachEffectivePermissions,
} = require('../services/permissionResolver.service');
const { ok, created } = require('../utils/response.util');
const { AppError } = require('../middlewares/errorHandler.middleware');
const { generateDossierId } = require('../utils/uuid.util');
const { TYPE_USER, STATUT_USER } = require('../utils/constants.util');
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

async function attachSecretaryServices(secretary, payload, transaction) {
  const serviceIds = normalizeSecretaryServiceIds(payload);

  if (serviceIds.length === 0) {
    await secretary.setServices_affectes([], { transaction });
    await secretary.update({ id_service_affecte: null }, { transaction });
    return [];
  }

  const services = await Service.findAll({
    where: { id_service: serviceIds },
    transaction,
  });

  if (services.length !== serviceIds.length) {
    throw new AppError('Un ou plusieurs services affectes sont invalides.', 400, 'INVALID_SERVICE_IDS');
  }

  await secretary.setServices_affectes(services, { transaction });
  await secretary.update({ id_service_affecte: serviceIds[0] }, { transaction });
  return serviceIds;
}

async function login(req, res, next) {
  try {
    const { login: loginInput, password } = req.body;

    const user = await Utilisateur.scope('withPassword').findOne({
      where: { login: loginInput },
      include: [{
        model: Role,
        as: 'role',
        include: [{ model: Permission, as: 'permissions', attributes: ['nom_permission'] }],
      }],
    });

    if (!user) throw new AppError('Login ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');

    if (user.statut !== STATUT_USER.ACTIF) {
      throw new AppError(`Compte ${user.statut}. Acces refuse.`, 403, 'ACCOUNT_INACTIVE');
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) throw new AppError('Login ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');

    const { permissions, delegatedPermissions } = await resolveEffectivePermissions(user);
    const accessToken = signAccessToken(user, permissions);
    const refreshToken = signRefreshToken(user);

    await auditManual(req, 'LOGIN', 'utilisateurs', { id_user: user.id_user, login: user.login });

    return ok(res, {
      accessToken,
      refreshToken,
      user: {
        id_user: user.id_user,
        login: user.login,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        photo_path: user.photo_path,
        type_user: user.type_user,
        statut: user.statut,
        date_creation: user.date_creation,
        effective_permissions: permissions,
        delegated_permissions: delegatedPermissions,
      },
    }, 'Connexion reussie.');
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const payload = verifyRefreshToken(refreshToken);

    const user = await Utilisateur.scope('withPassword').findByPk(payload.id_user, {
      include: [{
        model: Role,
        as: 'role',
        include: [{ model: Permission, as: 'permissions', attributes: ['nom_permission'] }],
      }],
    });

    if (!user || user.statut !== STATUT_USER.ACTIF) {
      throw new AppError('Compte invalide ou inactif.', 401, 'INVALID_REFRESH');
    }

    const { permissions } = await resolveEffectivePermissions(user);
    const accessToken = signAccessToken(user, permissions);

    return ok(res, { accessToken }, 'Token renouvele.');
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return next(new AppError('Refresh token invalide ou expire.', 401, 'INVALID_REFRESH'));
    }
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await auditManual(req, 'LOGOUT', 'utilisateurs', { id_user: req.user.id_user });
    return ok(res, null, 'Deconnexion reussie.');
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await loadUserWithPermissions(req.user.id_user);
    if (!user) throw new AppError('Utilisateur introuvable.', 404, 'NOT_FOUND');
    const { permissions, delegatedPermissions } = await resolveEffectivePermissions(user);
    return ok(res, attachEffectivePermissions(user, permissions, delegatedPermissions));
  } catch (err) {
    next(err);
  }
}

async function createProfileByRole(user, payload, transaction) {
  if (payload.type_user === TYPE_USER.MEDECIN) {
    await Medecin.create({
      id_user: user.id_user,
      code_rpps: payload.code_rpps,
      specialite_principale: payload.specialite_principale || null,
    }, { transaction });
    return;
  }

  if (payload.type_user === TYPE_USER.SECRETAIRE) {
    const secretary = await Secretaire.create({
      id_user: user.id_user,
      id_service_affecte: payload.id_service_affecte || null,
    }, { transaction });
    await attachSecretaryServices(secretary, payload, transaction);
    return;
  }

  await Patient.create({
    id_user: user.id_user,
    id_dossier_medical: generateDossierId(),
    num_secu_sociale: payload.num_secu_sociale || null,
    groupe_sanguin: payload.groupe_sanguin || null,
  }, { transaction });
}

async function register(req, res, next) {
  const transaction = await sequelize.transaction();

  try {
    const {
      login,
      password,
      nom,
      prenom,
      email,
      type_user,
      code_rpps,
      specialite_principale,
      id_service_affecte,
      id_services_affectes,
      num_secu_sociale,
      groupe_sanguin,
    } = req.body;

    const existing = await Utilisateur.findOne({
      where: {
        [Op.or]: [
          { login },
          ...(email ? [{ email }] : []),
        ],
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existing) {
      throw new AppError('Ce login ou email est deja utilise.', 409, 'USER_ALREADY_EXISTS');
    }

    const role = await Role.findOne({
      where: { nom_role: type_user },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!role) {
      throw new AppError(`Role ${type_user} introuvable.`, 500, 'ROLE_NOT_FOUND');
    }

    const user = await Utilisateur.create({
      login,
      password_hash: await hashPassword(password),
      nom,
      prenom,
      email,
      type_user,
      statut: STATUT_USER.ACTIF,
      id_role: role.id_role,
    }, { transaction });

    await createProfileByRole(user, {
      type_user,
      code_rpps,
      specialite_principale,
      id_service_affecte,
      id_services_affectes,
      num_secu_sociale,
      groupe_sanguin,
    }, transaction);

    await transaction.commit();

    const savedUser = await loadUserWithPermissions(user.id_user);

    const { permissions, delegatedPermissions } = await resolveEffectivePermissions(savedUser);
    const accessToken = signAccessToken(savedUser, permissions);
    const refreshToken = signRefreshToken(savedUser);

    await auditManual(req, 'REGISTER', 'utilisateurs', {
      id_user: user.id_user,
      login,
      type_user,
    });

    await created(res, {
      accessToken,
      refreshToken,
      user: {
        id_user: savedUser.id_user,
        login: savedUser.login,
        nom: savedUser.nom,
        prenom: savedUser.prenom,
        email: savedUser.email,
        photo_path: savedUser.photo_path,
        type_user: savedUser.type_user,
        statut: savedUser.statut,
        date_creation: savedUser.date_creation,
        effective_permissions: permissions,
        delegated_permissions: delegatedPermissions,
      },
    }, 'Inscription reussie.');
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

module.exports = { login, register, refresh, logout, me };
