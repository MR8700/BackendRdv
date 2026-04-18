'use strict';

const cron   = require('node-cron');
const { logger } = require('../utils/logger.util');
const rappelRdvJob         = require('./rappelRdv.job');
const nettoyageArchivesJob = require('./nettoyageArchives.job');

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrateur node-cron
// Appelé une seule fois dans app.js au démarrage du serveur.
//
// Planification :
//   Rappels RDV      → toutes les heures (0 * * * *)
//   Nettoyage/archivage → chaque nuit à 02h00 (0 2 * * *)
// ─────────────────────────────────────────────────────────────────────────────

function startScheduler() {
  // ── Rappels RDV — toutes les heures ────────────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      await rappelRdvJob.run();
    } catch (err) {
      logger.error('[SCHEDULER] rappelRdv non critique :', err.message);
    }
  });
  logger.info('[SCHEDULER] Job rappelRdv planifié — toutes les heures');

  // ── Nettoyage archives — chaque nuit à 02h00 ──────────────────────────────
  cron.schedule('0 2 * * *', async () => {
    try {
      await nettoyageArchivesJob.run();
    } catch (err) {
      logger.error('[SCHEDULER] nettoyageArchives non critique :', err.message);
    }
  });
  logger.info('[SCHEDULER] Job nettoyageArchives planifié — chaque nuit à 02h00');
}

module.exports = { startScheduler };