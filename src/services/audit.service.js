'use strict';

const { AuditLog } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// Service d'audit — écriture structurée dans la table audit_logs
// Appelé par audit.middleware.js et directement dans les controllers
// pour les actions métier critiques (confirmation RDV, archivage, etc.)
// ─────────────────────────────────────────────────────────────────────────────

async function log({ id_user = null, action_type, table_nom, details = {}, adresse_ip = '127.0.0.1' }) {
  try {
    await AuditLog.create({
      id_user,
      action_type,
      table_nom,
      description_details: details,
      adresse_ip,
    });
  } catch (err) {
    // L'audit ne doit jamais faire échouer l'opération principale
    console.error('[AUDIT SERVICE] Erreur :', err.message);
  }
}

async function getByUser(id_user, { page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  return AuditLog.findAndCountAll({
    where  : { id_user },
    order  : [['horodatage', 'DESC']],
    limit  : parseInt(limit, 10),
    offset,
  });
}

async function getAll({ page = 1, limit = 50, table_nom } = {}) {
  const where  = table_nom ? { table_nom } : {};
  const offset = (page - 1) * limit;
  return AuditLog.findAndCountAll({
    where,
    order : [['horodatage', 'DESC']],
    limit : parseInt(limit, 10),
    offset,
  });
}

module.exports = { log, getByUser, getAll };