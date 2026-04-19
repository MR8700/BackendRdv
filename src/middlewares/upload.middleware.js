'use strict';

const multer = require('multer');
const { upload } = require('../config/multer');
const { upload: uploadCfg } = require('../config/env');

// ─────────────────────────────────────────────
// Wrapper Multer propre
// ─────────────────────────────────────────────

function wrapMulter(multerMiddleware, fieldName) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next();

      // Multer errors
      if (err instanceof multer.MulterError) {
        const errors = {
          LIMIT_FILE_SIZE: {
            status: 413,
            code: 'FILE_TOO_LARGE',
            message: `Fichier trop volumineux. Max ${uploadCfg.maxSizeMb} Mo`,
          },
          LIMIT_UNEXPECTED_FILE: {
            status: 400,
            code: 'UNEXPECTED_FILE_FIELD',
            message: `Champ attendu : ${fieldName}`,
          },
        };

        const error = errors[err.code];

        return res.status(error?.status || 400).json({
          success: false,
          message: error?.message || err.message,
          code: error?.code || 'UPLOAD_ERROR',
        });
      }

      // MIME error
      if (err?.message?.includes('MIME')) {
        return res.status(415).json({
          success: false,
          message: err.message,
          code: 'INVALID_MIME_TYPE',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erreur upload serveur',
        code: 'UPLOAD_INTERNAL_ERROR',
      });
    });
  };
}

// ─────────────────────────────────────────────
// Upload middlewares
// ─────────────────────────────────────────────

const handlePhotoUpload   = wrapMulter(upload.photo, 'photo');
const handleLogoUpload    = wrapMulter(upload.logo, 'logo');
const handleServiceUpload = wrapMulter(upload.service, 'image');

// ─────────────────────────────────────────────
// Path normalisation (DB safe)
// ─────────────────────────────────────────────

function getRelativePath(req) {
  if (!req.file) return null;

  return req.file.path
    .replace(/\\/g, '/')
    .split('uploads/')
    .pop();
}

module.exports = {
  handlePhotoUpload,
  handleLogoUpload,
  handleServiceUpload,
  getRelativePath,
};