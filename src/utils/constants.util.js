'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Miroirs JS des ENUMs SQL — source unique de vérité
// Importés dans validators, controllers, services et jobs.
// Jamais de strings en dur dans le code.
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_USER = Object.freeze({
  PATIENT        : 'patient',
  MEDECIN        : 'medecin',
  SECRETAIRE     : 'secretaire',
  ADMINISTRATEUR : 'administrateur',
});

const STATUT_USER = Object.freeze({
  ACTIF    : 'actif',
  ARCHIVE  : 'archive',
  SUSPENDU : 'suspendu',
});

const STATUT_RDV = Object.freeze({
  EN_ATTENTE : 'en_attente',
  CONFIRME   : 'confirme',
  REFUSE     : 'refuse',
  ANNULE     : 'annule',
  ARCHIVE    : 'archive',
});

const TYPE_NOTIFICATION = Object.freeze({
  RAPPEL      : 'rappel',
  URGENCE     : 'urgence',
  INFORMATION : 'information',
});

const STATUT_JOB = Object.freeze({
  ATTENTE : 'attente',
  SUCCES  : 'succes',
  ECHEC   : 'echec',
});

const TYPE_TACHE = Object.freeze({
  ENVOYER_RAPPEL      : 'envoyer_rappel',
  NETTOYAGE_ARCHIVES  : 'nettoyage_archives',
});

const GROUPE_SANGUIN = Object.freeze({
  A_POS  : 'A+',  A_NEG  : 'A-',
  B_POS  : 'B+',  B_NEG  : 'B-',
  O_POS  : 'O+',  O_NEG  : 'O-',
  AB_POS : 'AB+', AB_NEG : 'AB-',
});

module.exports = {
  TYPE_USER,
  STATUT_USER,
  STATUT_RDV,
  TYPE_NOTIFICATION,
  STATUT_JOB,
  TYPE_TACHE,
  GROUPE_SANGUIN,
};