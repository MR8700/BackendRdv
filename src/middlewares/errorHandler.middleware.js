'use strict';

const { NODE_ENV } = require('../config/env');

// ─────────────────────────────────────────────────────────────────────────────
// Gestionnaire d'erreurs centralisé
//
// Doit être déclaré EN DERNIER dans app.js (après toutes les routes) :
//   app.use(errorHandler)
//
// Intercepte toutes les erreurs passées via next(err) dans les controllers
// et produit une réponse JSON uniforme.
// ─────────────────────────────────────────────────────────────────────────────

// ── Mapping des erreurs Sequelize → codes HTTP ────────────────────────────────

const SEQUELIZE_ERRORS = {
  SequelizeUniqueConstraintError    : { status: 409, message: 'Cette valeur existe déjà.' },
  SequelizeValidationError          : { status: 422, message: 'Données invalides.' },
  SequelizeForeignKeyConstraintError: { status: 409, message: 'Contrainte de clé étrangère violée.' },
  SequelizeDatabaseError            : { status: 500, message: 'Erreur base de données.' },
  SequelizeConnectionError          : { status: 503, message: 'Base de données indisponible.' },
  SequelizeTimeoutError             : { status: 503, message: 'Délai de connexion dépassé.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// errorHandler — middleware Express à 4 paramètres
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {

  // ── 1. Erreurs Sequelize ────────────────────────────────────────────────────
  const seqError = SEQUELIZE_ERRORS[err.name];
  if (seqError) {
    const details = err.errors?.map((e) => ({
      field  : e.path,
      message: e.message,
    }));

    return res.status(seqError.status).json({
      success: false,
      message: seqError.message,
      ...(details && { errors: details }),
      ...(NODE_ENV === 'development' && { debug: err.message }),
    });
  }

  // ── 2. Erreurs JWT (relayées manuellement) ─────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré.',
      code   : 'AUTH_ERROR',
    });
  }

  // ── 3. Erreurs métier personnalisées (AppError) ────────────────────────────
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      code   : err.code || 'APP_ERROR',
    });
  }

  // ── 4. Erreurs inattendues ─────────────────────────────────────────────────
  const statusCode = err.statusCode || err.status || 500;

  // En production, ne pas exposer les détails internes
  const message = NODE_ENV === 'production' && statusCode === 500
    ? 'Une erreur interne est survenue.'
    : err.message || 'Erreur interne.';

  console.error(`[ERROR] ${req.method} ${req.originalUrl} → ${err.message}`, err.stack);

  return res.status(statusCode).json({
    success: false,
    message,
    ...(NODE_ENV === 'development' && {
      stack: err.stack,
      name : err.name,
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AppError — classe d'erreur métier à utiliser dans les controllers
//
// Usage :
//   throw new AppError('Créneau indisponible.', 409, 'SLOT_UNAVAILABLE')
//   throw new AppError('Dossier médical introuvable.', 404, 'NOT_FOUND')
// ─────────────────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.name          = 'AppError';
    this.statusCode    = statusCode;
    this.code          = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── 404 — route introuvable (à placer avant errorHandler dans app.js) ─────────

function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
    code   : 'NOT_FOUND',
  });
}

module.exports = { errorHandler, notFound, AppError };