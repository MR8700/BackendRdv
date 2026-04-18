'use strict';

const { Utilisateur, Role, Permission, DelegationPermission } = require('../models');

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function toPermissionNames(permissions = []) {
  return permissions.map((permission) => permission.nom_permission);
}

async function loadUserWithPermissions(userId, options = {}) {
  return Utilisateur.findByPk(userId, {
    ...options,
    include: [
      {
        model: Role,
        as: 'role',
        include: [{ model: Permission, as: 'permissions' }],
      },
    ],
  });
}

async function resolveEffectivePermissions(userOrId) {
  const user = typeof userOrId === 'number'
    ? await loadUserWithPermissions(userOrId)
    : userOrId;

  if (!user) return { user: null, permissions: [], delegatedPermissions: [] };

  const rolePermissionNames = unique(toPermissionNames(user.role?.permissions));

  if (user.type_user !== 'secretaire') {
    return {
      user,
      permissions: rolePermissionNames,
      delegatedPermissions: [],
    };
  }

  const delegations = await DelegationPermission.findAll({
    where: { id_secretaire: user.id_user },
    include: [{ model: Permission, as: 'permission', attributes: ['nom_permission'] }],
  });

  const delegatedPermissions = unique(
    delegations.map((delegation) => delegation.permission?.nom_permission)
  );

  const effectivePermissions = unique([
    ...rolePermissionNames,
    ...delegatedPermissions,
  ]);

  return {
    user,
    permissions: effectivePermissions,
    delegatedPermissions,
  };
}

function attachEffectivePermissions(user, permissions = [], delegatedPermissions = []) {
  if (!user) return user;

  const plainUser = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  const rolePermissions = unique(permissions).map((nom_permission, index) => ({
    id_permission: -(index + 1),
    nom_permission,
  }));

  plainUser.role = {
    ...(plainUser.role || {}),
    permissions: rolePermissions,
  };
  plainUser.effective_permissions = unique(permissions);
  plainUser.delegated_permissions = unique(delegatedPermissions);

  return plainUser;
}

module.exports = {
  loadUserWithPermissions,
  resolveEffectivePermissions,
  attachEffectivePermissions,
};
