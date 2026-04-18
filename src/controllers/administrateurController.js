'use strict';

const {
  Administrateur,
  Utilisateur,
  Role,
  Permission,
  sequelize,
} = require('../models');
const { signAccessToken, signRefreshToken } = require('../services/token.service');
const { resolveEffectivePermissions } = require('../services/permissionResolver.service');
const { createInternalNotification } = require('../services/email.service');
const { ok, paginated, notFound, badRequest } = require('../utils/response.util');
const { AppError } = require('../middlewares/errorHandler.middleware');
const { auditManual } = require('../middlewares/audit.middleware');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { count, rows } = await Administrateur.findAndCountAll({
      include: [{ model: Utilisateur, as: 'utilisateur',
        attributes: ['id_user', 'nom', 'prenom', 'email', 'statut'] }],
      order : [[{ model: Utilisateur, as: 'utilisateur' }, 'nom', 'ASC']],
      limit : parseInt(limit, 10),
      offset: (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const admin = await Administrateur.findByPk(req.params.id_user, {
      include: [{ model: Utilisateur, as: 'utilisateur',
        attributes: ['id_user', 'nom', 'prenom', 'email', 'statut'] }],
    });
    if (!admin) return notFound(res, 'Administrateur');
    return ok(res, admin);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const admin = await Administrateur.findByPk(req.params.id_user);
    if (!admin) return notFound(res, 'Administrateur');
    const { niveau_acces } = req.body;
    await admin.update({ niveau_acces });
    await auditManual(req, 'UPDATE_ADMIN', 'administrateurs', { id_user: admin.id_user });
    return ok(res, admin, 'Profil administrateur mis à jour.');
  } catch (err) { next(err); }
}

async function getPermissionMatrix(req, res, next) {
  try {
    const [roles, permissions] = await Promise.all([
      Role.findAll({
        order: [['nom_role', 'ASC']],
        include: [{ model: Permission, as: 'permissions' }],
      }),
      Permission.findAll({ order: [['nom_permission', 'ASC']] }),
    ]);

    return ok(res, { roles, permissions });
  } catch (err) {
    next(err);
  }
}

async function updateRolePermissions(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const roleId = Number(req.params.id_role);
    const permissionIds = Array.isArray(req.body.permission_ids) ? req.body.permission_ids : [];

    if (!Number.isFinite(roleId)) {
      await transaction.rollback();
      return badRequest(res, 'id_role invalide.');
    }

    const role = await Role.findByPk(roleId, { transaction });
    if (!role) {
      await transaction.rollback();
      return notFound(res, 'Role');
    }

    const foundPermissions = await Permission.findAll({
      where: { id_permission: permissionIds },
      transaction,
    });

    if (foundPermissions.length !== permissionIds.length) {
      await transaction.rollback();
      return badRequest(res, 'Une ou plusieurs permissions sont invalides.');
    }

    await role.setPermissions(foundPermissions, { transaction });
    await transaction.commit();

    await auditManual(req, 'UPDATE_ROLE_PERMISSIONS', 'role_permissions', {
      id_role: roleId,
      permission_count: permissionIds.length,
    });

    const updatedRole = await Role.findByPk(roleId, {
      include: [{ model: Permission, as: 'permissions' }],
    });

    return ok(res, updatedRole, 'Permissions du role mises a jour.');
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

async function requestAccountAccess(req, res, next) {
  try {
    const targetUserId = Number(req.body.target_user_id);
    const justification = String(req.body.justification || '').trim();

    if (!Number.isFinite(targetUserId) || !justification) {
      return badRequest(res, 'target_user_id et justification sont requis.');
    }

    if (targetUserId === req.user.id_user) {
      return badRequest(res, 'Vous etes deja sur votre propre compte.');
    }

    const [targetUser, actor] = await Promise.all([
      Utilisateur.findByPk(targetUserId),
      Utilisateur.findByPk(req.user.id_user),
    ]);

    if (!targetUser) return notFound(res, 'Utilisateur cible');

    const notif = await createInternalNotification({
      id_user: targetUser.id_user,
      type_notification: 'information',
      message: `Demande d'acces au compte par ${actor?.prenom || 'Admin'} ${actor?.nom || ''}. Justification: ${justification}`,
      created_by_user_id: req.user.id_user,
    });

    await auditManual(req, 'REQUEST_IMPERSONATION', 'notifications', {
      target_user_id: targetUser.id_user,
      id_notif: notif.id_notif,
    });

    return ok(res, { id_notif: notif.id_notif }, 'Demande envoyee a l utilisateur.');
  } catch (err) {
    next(err);
  }
}

async function forceAccountAccess(req, res, next) {
  try {
    const targetUserId = Number(req.body.target_user_id);
    const justification = String(req.body.justification || '').trim();

    if (!Number.isFinite(targetUserId) || !justification) {
      return badRequest(res, 'target_user_id et justification sont requis.');
    }

    if (!req.user.permissions?.includes('forcer_navigation_compte')) {
      throw new AppError(
        "Permission manquante: forcer_navigation_compte.",
        403,
        'FORBIDDEN_PERMISSION'
      );
    }

    const targetUser = await Utilisateur.findByPk(targetUserId, {
      include: [{ model: Role, as: 'role', include: [{ model: Permission, as: 'permissions' }] }],
    });

    if (!targetUser) return notFound(res, 'Utilisateur cible');
    if (targetUser.id_user === req.user.id_user) {
      return badRequest(res, 'Vous etes deja connecte sur ce compte.');
    }

    const { permissions: targetPermissions } = await resolveEffectivePermissions(targetUser);

    const accessToken = signAccessToken(targetUser, targetPermissions, {
      impersonation: {
        actor_user_id: req.user.id_user,
        actor_login: req.user.login,
        forced: true,
        justification,
      },
    });
    const refreshToken = signRefreshToken(targetUser);

    await createInternalNotification({
      id_user: targetUser.id_user,
      type_notification: 'information',
      message: `Acces force a votre compte par un administrateur. Justification: ${justification}`,
      created_by_user_id: req.user.id_user,
    });

    await auditManual(req, 'FORCE_IMPERSONATION', 'utilisateurs', {
      target_user_id: targetUser.id_user,
      justification,
    });

    return ok(res, {
      accessToken,
      refreshToken,
      user: {
        id_user: targetUser.id_user,
        login: targetUser.login,
        nom: targetUser.nom,
        prenom: targetUser.prenom,
        type_user: targetUser.type_user,
        statut: targetUser.statut,
      },
      impersonation: {
        actor_user_id: req.user.id_user,
        target_user_id: targetUser.id_user,
        forced: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getOne,
  update,
  getPermissionMatrix,
  updateRolePermissions,
  requestAccountAccess,
  forceAccountAccess,
};
