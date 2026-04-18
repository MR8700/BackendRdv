'use strict';

const jwt = require('jsonwebtoken');
const { jwt: jwtCfg } = require('../config/env');

// ─────────────────────────────────────────────────────────────────────────────
// Payload encodé dans le token — champs issus de la table utilisateurs
// + permissions chargées via role_permissions
// ─────────────────────────────────────────────────────────────────────────────

function signAccessToken(user, permissions = [], extraClaims = {}) {
  return jwt.sign(
    {
      id_user    : user.id_user,
      login      : user.login,
      type_user  : user.type_user,
      id_role    : user.id_role,
      statut     : user.statut,
      permissions,
      ...extraClaims,
    },
    jwtCfg.secret,
    { expiresIn: jwtCfg.expiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id_user: user.id_user, login: user.login },
    jwtCfg.refreshSecret,
    { expiresIn: jwtCfg.refreshExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtCfg.secret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, jwtCfg.refreshSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
