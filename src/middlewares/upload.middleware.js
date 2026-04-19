'use strict';

const cloudStorage = require('../services/cloudStorage.service');
const multer = require('multer');

// ─────────────────────────────────────────────────────────────────────────────
// Middleware Upload
//
// Enveloppe les instances Multer de config/multer.js pour centraliser
// la gestion des erreurs et produire des réponses JSON cohérentes.
//
// Correspondance avec les champs SQL :
//   handlePhotoUpload   → utilisateurs.photo_path
//   handleLogoUpload    → clinique.logo_path
//   handleServiceUpload → services.image_path
//
// Après exécution, le controller récupère :
//   req.file.path     → chemin relatif à stocker dans *_path
//   req.file.filename → nom du fichier généré
//   req.file.size     → taille en octets
// ─────────────────────────────────────────────────────────────────────────────

// ── Wrapper générique ─────────────────────────────────────────────────────────

function wrapMulter(multerMiddleware, fieldName) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next();

      // Erreurs Multer natives
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(413).json({
              success: false,
              message: `Fichier trop volumineux. Taille maximale autorisée : ${
                require('../config/env').upload.maxSizeMb
              } Mo.`,
              code: 'FILE_TOO_LARGE',
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              message: err.message || `Champ de fichier inattendu. Utilisez le champ "${fieldName}".`,
              code   : 'UNEXPECTED_FILE_FIELD',
            });
          default:
            return res.status(400).json({
              success: false,
              message: `Erreur upload : ${err.message}`,
              code   : 'UPLOAD_ERROR',
            });
        }
      }

      // Erreur MIME (levée par mimeFilter dans config/multer.js)
      if (err && err.message?.includes('Type MIME non autorisé')) {
        return res.status(415).json({
          success: false,
          message: err.message,
          code   : 'INVALID_MIME_TYPE',
        });
      }

      // Erreur inconnue
      return res.status(500).json({
        success: false,
        message: 'Erreur interne lors du traitement du fichier.',
        code   : 'UPLOAD_INTERNAL_ERROR',
      });
    });
  };
}

// ── Middlewares exportés ──────────────────────────────────────────────────────

// Pour les routes : router.put('/:id/photo', handlePhotoUpload, controller.update)
const handlePhotoUpload   = cloudStorage.photoUpload;
const handleLogoUpload    = cloudStorage.logoUpload;
const handleServiceUpload = cloudStorage.serviceUpload;

// ── Helper : normalise le chemin stocké en base ───────────────────────────────
// Transforme le chemin absolu du disque en chemin relatif pour *_path SQL
// ex: /home/user/project/uploads/photos/uuid.jpg → uploads/photos/uuid.jpg

function getRelativePath(req) {
  if (!req.file) return null;
  return req.file.path.replace(/\\/g, '/'); // Normalise les séparateurs Windows
}

module.exports = {
  handlePhotoUpload,
  handleLogoUpload,
  handleServiceUpload,
  getRelativePath,
};