
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

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token manquant. Fournissez un header Authorization: Bearer <token>.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, jwtConfig.secret);

    // Vérification du statut utilisateur (archivé ou suspendu = accès refusé)
    // Le statut est encodé dans le token pour éviter une requête DB à chaque appel
    if (payload.statut !== 'actif') {
      return res.status(403).json({
        success: false,
        message: `Compte ${payload.statut}. Accès refusé.`,
      });
    }

    req.user = payload; // { id_user, login, type_user, id_role, statut, iat, exp }
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré. Utilisez le endpoint /auth/refresh.',
        code   : 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token invalide.',
      code   : 'TOKEN_INVALID',
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

module.exports = { authenticate, authenticateOptional };

