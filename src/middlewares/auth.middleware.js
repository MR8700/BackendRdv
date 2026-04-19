
'use strict';

const jwt        = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

// ─────────────────────────────────────────────────────────────────────────────
// Middleware d'authentification JWT
//
// Vérifie le token Bearer dans le header Authorization.
// En cas de succès, injecte req.user avec les champs du payload :
//   { id_user, login, type_user, id_role, statut }
//
// Ces champs viennent directement de la table `utilisateurs` et sont
// encodés dans le token par token.service.js lors du login.
// ─────────────────────────────────────────────────────────────────────────────

async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token manquant. Authorization: Bearer <token>',
      code: 'MISSING_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify signature
    const payload = jwt.verify(token, jwtConfig.secret);

    // Check blacklist (Redis jti)
    const redis = await getRedis();
    const isBlacklisted = await redis.get(`blacklist:${payload.jti || token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token révoqué.',
        code: 'TOKEN_REVOKED'
      });
    }

    // Status check
    if (payload.statut !== 'actif') {
      return res.status(403).json({
        success: false,
        message: `Compte ${payload.statut}`,
        code: 'ACCOUNT_INACTIVE'
      });
    }

    req.user = payload;
    next();

  } catch (err) {
    logger.warn(`[AUTH] Invalid token: ${err.message}`, { tokenPrefix: token.substring(0, 20), reqId: req.id });
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré. Refresh required.',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token signature invalide.',
        code: 'INVALID_SIGNATURE'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token invalide.',
      code: 'TOKEN_INVALID'
    });
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Middleware optionnel — n'échoue pas si aucun token n'est fourni.
// Utilisé pour les routes publiques qui se comportent différemment
// si l'utilisateur est connecté (ex: consultation des disponibilités).
// ─────────────────────────────────────────────────────────────────────────────

function authenticateOptional(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  return authenticate(req, res, next);
}

// Add Redis getRedis from token.service
const { getRedis } = require('../config/redis');
const logger = require('../utils/prodLogger').logger;

module.exports = { authenticate, authenticateOptional };


