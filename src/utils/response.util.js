'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Format de réponse uniforme — utilisé dans tous les controllers
// Structure : { success, message, data?, meta?, errors? }
// ─────────────────────────────────────────────────────────────────────────────

const ok = (res, data = null, message = 'Succès.', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const created = (res, data = null, message = 'Ressource créée.') =>
  res.status(201).json({ success: true, message, data });

const paginated = (res, rows, count, page, limit) =>
  res.status(200).json({
    success : true,
    message : 'Succès.',
    data    : rows,
    meta    : {
      total      : count,
      page       : parseInt(page, 10),
      limit      : parseInt(limit, 10),
      totalPages : Math.ceil(count / limit),
    },
  });

const noContent = (res) => res.status(204).send();

const notFound = (res, resource = 'Ressource') =>
  res.status(404).json({ success: false, message: `${resource} introuvable.` });

const badRequest = (res, message = 'Requête invalide.') =>
  res.status(400).json({ success: false, message });

const forbidden = (res, message = 'Accès refusé.') =>
  res.status(403).json({ success: false, message });

const conflict = (res, message = 'Conflit de données.') =>
  res.status(409).json({ success: false, message });

module.exports = { ok, created, paginated, noContent, notFound, badRequest, forbidden, conflict };