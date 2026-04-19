'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { upload } = require('./env');

/**
 * =========================
 * DESTINATIONS
 * =========================
 */
const DESTINATIONS = {
  photos: path.join(upload.baseDir, 'photos'),
  logos: path.join(upload.baseDir, 'logos'),
  services: path.join(upload.baseDir, 'services'),
};

/**
 * CREATE FOLDERS
 */
Object.values(DESTINATIONS).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[UPLOAD] Folder created: ${dir}`);
  }
});

/**
 * STORAGE FACTORY
 */
function createStorage(destination) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),

    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${randomUUID()}-${Date.now()}${ext}`;
      cb(null, name);
    },
  });
}

/**
 * MIME FILTER
 */
function mimeFilter(_req, file, cb) {
  if (upload.allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `MIME non autorisé: ${file.mimetype}`
      ),
      false
    );
  }
}

const limits = {
  fileSize: upload.maxSizeMb * 1024 * 1024,
};

/**
 * =========================
 * EXPORT MULTER INSTANCES
 * =========================
 */
const photo = multer({
  storage: createStorage(DESTINATIONS.photos),
  fileFilter: mimeFilter,
  limits,
});

const logo = multer({
  storage: createStorage(DESTINATIONS.logos),
  fileFilter: mimeFilter,
  limits,
});

const service = multer({
  storage: createStorage(DESTINATIONS.services),
  fileFilter: mimeFilter,
  limits,
});

/**
 * DELETE OLD FILE
 */
function deleteOldFile(filePath) {
  if (!filePath) return;

  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  fs.unlink(abs, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.warn('[UPLOAD] Delete error:', err.message);
    }
  });
}

module.exports = {
  photo,
  logo,
  service,
  DESTINATIONS,
  deleteOldFile,
};