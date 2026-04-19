'use strict';

const { NODE_ENV } = require('../config/env');

// ─────────────────────────────────────────────
// MAP ERREURS SEQUELIZE COMPLET
// ─────────────────────────────────────────────

const SEQUELIZE_ERRORS = {
  SequelizeUniqueConstraintError: {
    status: 409,
    message: 'Cette valeur existe déjà.',
  },
  SequelizeValidationError: {
    status: 422,
    message: 'Données invalides.',
  },
  SequelizeForeignKeyConstraintError: {
    status: 409,
    message: 'Contrainte de clé étrangère violée.',
  },
  SequelizeDatabaseError: {
    status: 500,
    message: 'Erreur base de données.',
  },
  SequelizeConnectionError: {
    status: 503,
    message: 'Base de données indisponible.',
  },
  SequelizeTimeoutError: {
    status: 503,
    message: 'Délai de connexion dépassé.',
  },

  // 🔥 AJOUT IMPORTANT (TON BUG ACTUEL)
  SequelizeHostNotFoundError: {
    status: 503,
    message: 'Hôte base de données introuvable.',
  },
  SequelizeConnectionRefusedError: {
    status: 503,
    message: 'Connexion refusée à la base de données.',
  },
};

// ─────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const seqError = SEQUELIZE_ERRORS[err.name];

  // ── 1. ERREURS SEQUELIZE ─────────────────────────
  if (seqError) {
    console.error('🔥 SEQUELIZE ERROR:', {
      name: err.name,
      message: err.message,
      sql: err.sql || null,
    });

    return res.status(seqError.status).json({
      success: false,
      message: seqError.message,
      code: err.name,
      ...(NODE_ENV !== 'production' && {
        debug: err.message,
        sql: err.sql,
      }),
    });
  }

  // ── 2. JWT ───────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré.',
      code: 'AUTH_ERROR',
    });
  }

  // ── 3. ERREURS METIER ────────────────────────────
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      code: err.code || 'APP_ERROR',
    });
  }

  // ── 4. ERREUR INATTENDUE ─────────────────────────
  const statusCode = err.statusCode || 500;

  console.error('💥 UNHANDLED ERROR:', {
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: err.stack,
  });

  return res.status(statusCode).json({
    success: false,
    message:
      NODE_ENV === 'production'
        ? 'Une erreur interne est survenue.'
        : err.message,

    ...(NODE_ENV !== 'production' && {
      stack: err.stack,
      name: err.name,
    }),
  });
}

// ─────────────────────────────────────────────
// APP ERROR CLASS
// ─────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────

function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
}

module.exports = {
  errorHandler,
  notFound,
  AppError,
};