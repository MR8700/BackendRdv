'use strict';

const Joi = require('joi');

const create = Joi.object({
  id_medecin : Joi.number().integer().positive().required(),
  id_service : Joi.number().integer().positive().optional(),
});

const createDispo = Joi.object({
  id_medecin      : Joi.number().integer().positive().required(),
  id_service      : Joi.number().integer().positive().optional(),
  date_heure_debut: Joi.date().iso().greater('now').required(),
  date_heure_fin  : Joi.date().iso().greater(Joi.ref('date_heure_debut')).required().messages({
    'date.greater': 'date_heure_fin doit être postérieure à date_heure_debut.',
  }),
  capacite_max: Joi.number().integer().min(1).max(50).default(1),
});

const idParam = Joi.object({
  id_planning: Joi.number().integer().positive().required(),
});

const idDispoParam = Joi.object({
  id_dispo: Joi.number().integer().positive().required(),
});

module.exports = { create, createDispo, idParam, idDispoParam };