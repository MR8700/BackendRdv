'use strict';

const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { render, upload } = require('../config/env');
const logger = require('../utils/prodLogger').logger;

/**
 * Render Disks + Multer Memory → Persistent Storage Service
 * - Memory buffer → fs.writeFile to RENDER_DISK_PATH
 * - Returns relative path for DB *_path field
 * - Auto cleanup old files (cron Phase 4)
 */

class CloudStorageService {
  constructor() {
    this.diskPath = render.diskPath;
    this.maxSizeMb = upload.maxSizeMb * 1024 * 1024;
    this.allowedMimes = upload.allowedMimes;
    
    // Ensure disk path exists
    fs.mkdir(this.diskPath, { recursive: true }).catch(err => logger.warn(`[STORAGE] Disk mkdir: ${err.message}`));
  }

  // Generate safe filename
  generateFilename(originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const uuid = crypto.randomUUID().replace(/-/g, '');
    return `${uuid}-${timestamp}${ext}`;
  }

  // Memory storage callback
  memoryStorage(fieldName) {
    return multer.memoryStorage();
  }

  // MIME filter
  mimeFilter(req, file, cb) {
    if (this.allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`MIME non autorisé: ${file.mimetype}`), false);
    }
  }

  // Process uploaded buffer → disk + return relative path
  async processBuffer(buffer, originalName, subdir) {
    const filename = this.generateFilename(originalName);
    const relativePath = path.join(subdir, filename).replace(/\\/g, '/');
    const absPath = path.join(this.diskPath, relativePath);

    try {
      await fs.writeFile(absPath, buffer);
      logger.debug(`[STORAGE] File saved: ${relativePath}`);
      return relativePath;
    } catch (err) {
      logger.error(`[STORAGE] Write failed: ${absPath}`, err);
      throw err;
    }
  }

  // Multer instance factory
  createMulter(subdir) {
    return multer({
      storage: this.memoryStorage(subdir),
      fileFilter: this.mimeFilter.bind(this),
      limits: { fileSize: this.maxSizeMb }
    }).single('file');
  }

  // Photo upload (utilisateurs.photo_path)
  photoUpload = this.createMulter('photos');
  logoUpload = this.createMulter('logos');
  serviceUpload = this.createMulter('services');

  // Controller helper: handle upload + save path to model
  async handleUpload(req, modelField) {
    if (!req.file) throw new Error('No file uploaded');
    
    const subdir = modelField.includes('photo') ? 'photos' : 
                   modelField.includes('logo') ? 'logos' : 'services';
    
    const relativePath = await this.processBuffer(
      req.file.buffer, 
      req.file.originalname, 
      subdir
    );
    
    return relativePath;
  }

  // Cleanup old file
  async deleteFile(relativePath) {
    if (!relativePath) return;
    const absPath = path.join(this.diskPath, relativePath);
    await fs.unlink(absPath).catch(err => {
      if (err.code !== 'ENOENT') logger.warn(`[STORAGE] Delete failed: ${absPath}`, err);
    });
  }
}

module.exports = new CloudStorageService();

