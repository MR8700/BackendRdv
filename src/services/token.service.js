'use strict';

const jwt = require('jsonwebtoken');
const { jwt: jwtCfg, jwtBlacklist, render } = require('../config/env');
const Redis = require('redis');
const logger = require('../utils/prodLogger').logger;

let redisClient;

// Use centralized Redis
const { getRedis } = require('../config/redis');

// Remove local getRedis - use global



// ─────────────────────────────────────────────────────────────────────────────
// Payload encodé dans le token — champs issus de la table utilisateurs
// + permissions chargées via role_permissions
// ─────────────────────────────────────────────────────────────────────────────

async function signAccessToken(user, permissions = [], extraClaims = {}) {
  const token = jwt.sign(
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

  // Blacklist refresh token on logout (cleanup)
  const jti = require('uuid').v4();
  await getRedis();
  redisClient.setex(`blacklist:${jti}`, jwtCfg.expiresIn, '1');
  
  token.jti = jti;
  return token;
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
