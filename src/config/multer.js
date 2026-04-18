'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { randomUUID } = require('crypto');
const { upload } = require('./env');

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Correspondance avec les champs *_path du schÃ©ma SQL :
//   clinique.logo_path    â†’ uploads/logos/
//   utilisateurs.photo_path â†’ uploads/photos/
//   services.image_path   â†’ uploads/services/
//
// Chaque destination est crÃ©Ã©e automatiquement si elle n'existe pas.
// Le nom de fichier suit le format : <uuid>-<timestamp>.<ext>
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Destinations autorisÃ©es â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DESTINATIONS = {
  photos  : path.join(upload.baseDir, 'photos'),
  logos   : path.join(upload.baseDir, 'logos'),
  services: path.join(upload.baseDir, 'services'),
};

// CrÃ©ation des dossiers au dÃ©marrage si absents
Object.values(DESTINATIONS).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[UPLOAD] Dossier crÃ©Ã© : ${dir}`);
  }
});

// â”€â”€ GÃ©nÃ©rateur de storage Multer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function createStorage(destination) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),

    filename: (_req, file, cb) => {
      const ext      = path.extname(file.originalname).toLowerCase();
      const safeName = `${randomUUID()}-${Date.now()}${ext}`;
      cb(null, safeName);
    },
  });
}

// â”€â”€ Filtre MIME commun â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function mimeFilter(_req, file, cb) {
  if (upload.allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Type MIME non autorisÃ© : ${file.mimetype}. ` +
        `AcceptÃ©s : ${upload.allowedMimes.join(', ')}`
      ),
      false
    );
  }
}

const limits = { fileSize: upload.maxSizeMb * 1024 * 1024 };

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Instances Multer exportÃ©es â€” une par contexte SQL
//
// Usage dans les routes :
//   router.put('/:id/logo', uploadLogo.single('logo'), cliniqueController.updateLogo);
//   router.put('/:id/photo', uploadPhoto.single('photo'), utilisateurController.updatePhoto);
//   router.post('/', uploadService.single('image'), serviceController.create);
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const uploadPhoto = multer({
  storage   : createStorage(DESTINATIONS.photos),
  fileFilter: mimeFilter,
  limits,
});

const uploadLogo = multer({
  storage   : createStorage(DESTINATIONS.logos),
  fileFilter: mimeFilter,
  limits,
});

const uploadService = multer({
  storage   : createStorage(DESTINATIONS.services),
  fileFilter: mimeFilter,
  limits,
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helper : suppression de l'ancien fichier lors d'une mise Ã  jour
// AppelÃ© dans les controllers avant d'Ã©crire le nouveau *_path en base
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function deleteOldFile(filePath) {
  if (!filePath) return;
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  fs.unlink(abs, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.warn(`[UPLOAD] Impossible de supprimer l'ancien fichier : ${abs}`, err.message);
    }
  });
}

module.exports = {
  uploadPhoto,
  uploadLogo,
  uploadService,
  DESTINATIONS,
  deleteOldFile,
};
