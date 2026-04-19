'use strict';

const multer = require('multer');
const { photo, logo, service } = require('../config/multer');
const { upload: uploadCfg } = require('../config/env');

/**
 * WRAPPER MULTER
 */
function wrapMulter(multerMiddleware, fieldName) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next();

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
            message: `Champ attendu: ${fieldName}`,
          },
        };

        const e = errors[err.code];

        return res.status(e?.status || 400).json({
          success: false,
          message: e?.message || err.message,
          code: e?.code || 'UPLOAD_ERROR',
        });
      }

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

/**
 * =========================
 * EXPORT MIDDLEWARES
 * =========================
 */
const handlePhotoUpload = wrapMulter(photo.single('photo'), 'photo');
const handleLogoUpload = wrapMulter(logo.single('logo'), 'logo');
const handleServiceUpload = wrapMulter(service.single('image'), 'image');

/**
 * PATH CLEAN DB
 */
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