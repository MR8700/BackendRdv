'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Middleware d'audit
//
// Alimente la table `audit_logs` du schéma SQL :
//   id_log              INT AUTO_INCREMENT
//   horodatage          DATETIME DEFAULT CURRENT_TIMESTAMP
//   id_user             INT (FK → utilisateurs)
//   action_type         VARCHAR(50)
//   table_nom           VARCHAR(50)
//   description_details JSON
//   adresse_ip          VARCHAR(45)   ← validé par trigger SQL (IPv4/IPv6)
//
// Deux modes d'utilisation :
//   1. auditAfter  → middleware Express post-response (logging automatique)
//   2. auditManual → fonction appelée explicitement dans les controllers
//      pour les actions métier précises (ex: confirmation RDV, archivage)
// ─────────────────────────────────────────────────────────────────────────────

// Import différé pour éviter la dépendance circulaire models ↔ middlewares
let AuditLog;
function getModel() {
  if (!AuditLog) AuditLog = require('../models/AuditLog');
  return AuditLog;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction de l'IP réelle
// Gère les proxies (X-Forwarded-For), IPv6 loopback ::1 → 127.0.0.1
// Le trigger SQL valide le format — on doit lui envoyer une IP propre.
// ─────────────────────────────────────────────────────────────────────────────

function extractIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = forwarded
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || req.ip || '0.0.0.0';

  // Convertir IPv6 loopback en IPv4
  if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
  // Supprimer le préfixe IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (ip.startsWith('::ffff:')) ip = ip.substring(7);

  return ip;
}

// ─────────────────────────────────────────────────────────────────────────────
// Déduction automatique de l'action à partir de la méthode HTTP
// ─────────────────────────────────────────────────────────────────────────────

const METHOD_ACTION_MAP = {
  GET    : 'READ',
  POST   : 'CREATE',
  PUT    : 'UPDATE',
  PATCH  : 'PATCH',
  DELETE : 'DELETE',
};

// ─────────────────────────────────────────────────────────────────────────────
// auditAfter — middleware automatique
// S'attache en fin de chaîne sur les routes sensibles.
// Enregistre l'action APRÈS que la réponse a été envoyée (res.on('finish')).
//
// Usage dans les routes :
//   router.post('/rdv', authenticate, rendezVousController.create, auditAfter('rendez_vous'))
// ─────────────────────────────────────────────────────────────────────────────

function auditAfter(tableNom) {
  return (req, res, next) => {
    res.on('finish', async () => {
      // Ne pas logger les requêtes qui ont échoué côté client (4xx sauf 401/403)
      // ou qui sont des lectures simples non critiques
      if (res.statusCode >= 500) return;
      if (res.statusCode === 404) return;

      try {
        const Model = getModel();
        await Model.create({
          id_user            : req.user?.id_user || null,
          action_type        : METHOD_ACTION_MAP[req.method] || req.method,
          table_nom          : tableNom,
          description_details: JSON.stringify({
            method    : req.method,
            path      : req.originalUrl,
            statusCode: res.statusCode,
            params    : req.params,
            // Ne pas logger le body (données sensibles / mots de passe)
          }),
          adresse_ip: extractIp(req),
        });
      } catch (err) {
        // L'audit ne doit jamais faire planter la requête principale
        console.error('[AUDIT] Erreur d\'écriture dans audit_logs :', err.message);
      }
    });

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// auditManual — fonction utilitaire pour les controllers
// Permet d'enregistrer des actions métier précises avec des détails riches.
//
// Usage dans un controller :
//   await auditManual(req, 'CONFIRM_RDV', 'rendez_vous', {
//     id_rdv: rdv.id_rdv, ancien_statut: 'en_attente', nouveau_statut: 'confirme'
//   });
// ─────────────────────────────────────────────────────────────────────────────

async function auditManual(req, actionType, tableNom, details = {}) {
  try {
    const Model = getModel();
    await Model.create({
      id_user            : req.user?.id_user || null,
      action_type        : actionType,
      table_nom          : tableNom,
      description_details: JSON.stringify(details),
      adresse_ip         : extractIp(req),
    });
  } catch (err) {
    console.error('[AUDIT] Erreur auditManual :', err.message);
  }
}

module.exports = { auditAfter, auditManual, extractIp };


