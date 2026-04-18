'use strict';

const fs   = require('fs');
const path = require('path');
const { deleteOldFile } = require('../config/multer');

// ─────────────────────────────────────────────────────────────────────────────
// Service upload — gestion physique des fichiers
// Utilisé dans les controllers pour mettre à jour *_path en base
// après que Multer a déposé le fichier sur le disque
// ─────────────────────────────────────────────────────────────────────────────

// Normalise le chemin pour le stocker en base (séparateurs Unix)
function normalizePath(filePath) {
  if (!filePath) return null;
  return filePath.replace(/\\/g, '/');
}

// Remplace l'ancien fichier et retourne le nouveau chemin relatif
function replaceFile(req, ancienPath) {
  if (!req.file) return ancienPath; // Pas de nouveau fichier → garder l'ancien
  deleteOldFile(ancienPath);
  return normalizePath(req.file.path);
}

// Supprime un fichier du disque (ex: suppression d'un utilisateur)
function removeFile(filePath) {
  if (!filePath) return;
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
}

module.exports = { normalizePath, replaceFile, removeFile };