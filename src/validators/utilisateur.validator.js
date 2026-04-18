'use strict';

const Joi = require('joi');
const { TYPE_USER, STATUT_USER } = require('../utils/constants.util');

const idParam = Joi.object({
  id_user: Joi.number().integer().positive().required(),
});

const create = Joi.object({
  login     : Joi.string().max(50).required(),
  password  : Joi.string().min(6).max(255).required(),
  nom       : Joi.string().max(100).required(),
  prenom    : Joi.string().max(100).required(),
  email     : Joi.string().email().max(100).optional(),
  type_user : Joi.string().valid(...Object.values(TYPE_USER)).required(),
  id_role   : Joi.number().integer().positive().optional(),
  code_rpps: Joi.when('type_user', {
    is       : TYPE_USER.MEDECIN,
    then     : Joi.string().max(20).required(),
    otherwise: Joi.forbidden(),
  }),
  specialite_principale: Joi.when('type_user', {
    is       : TYPE_USER.MEDECIN,
    then     : Joi.string().max(100).optional(),
    otherwise: Joi.forbidden(),
  }),
  id_service_affecte: Joi.when('type_user', {
    is       : TYPE_USER.SECRETAIRE,
    then     : Joi.number().integer().positive().optional(),
    otherwise: Joi.forbidden(),
  }),
  id_services_affectes: Joi.when('type_user', {
    is       : TYPE_USER.SECRETAIRE,
    then     : Joi.array().items(Joi.number().integer().positive()).unique().optional(),
    otherwise: Joi.forbidden(),
  }),
  niveau_acces: Joi.when('type_user', {
    is       : TYPE_USER.ADMINISTRATEUR,
    then     : Joi.number().integer().min(1).max(2).optional(),
    otherwise: Joi.forbidden(),
  }),
  num_secu_sociale: Joi.when('type_user', {
    is       : TYPE_USER.PATIENT,
    then     : Joi.string().max(20).optional(),
    otherwise: Joi.forbidden(),
  }),
  groupe_sanguin: Joi.when('type_user', {
    is       : TYPE_USER.PATIENT,
    then     : Joi.string().valid('A+','A-','B+','B-','O+','O-','AB+','AB-').optional(),
    otherwise: Joi.forbidden(),
  }),
});

const update = Joi.object({
  login  : Joi.string().max(50).optional(),
  nom    : Joi.string().max(100).optional(),
  prenom : Joi.string().max(100).optional(),
  email  : Joi.string().email().max(100).optional(),
  id_role: Joi.number().integer().positive().optional(),
  statut : Joi.string().valid(...Object.values(STATUT_USER)).optional(),
  code_rpps: Joi.string().max(20).optional(),
  specialite_principale: Joi.string().max(100).allow('', null).optional(),
  id_service_affecte: Joi.number().integer().positive().allow(null).optional(),
  id_services_affectes: Joi.array().items(Joi.number().integer().positive()).unique().optional(),
  niveau_acces: Joi.number().integer().min(1).max(2).optional(),
  num_secu_sociale: Joi.string().max(20).allow('', null).optional(),
  groupe_sanguin: Joi.string().valid('A+','A-','B+','B-','O+','O-','AB+','AB-').allow('', null).optional(),
}).min(1).messages({ 'object.min': 'Au moins un champ à modifier est requis.' });

const changePassword = Joi.object({
  ancien_password  : Joi.string().required(),
  nouveau_password : Joi.string().min(6).max(255).required(),
  confirmation     : Joi.any().valid(Joi.ref('nouveau_password')).required().messages({
    'any.only': 'La confirmation ne correspond pas au nouveau mot de passe.',
  }),
});

module.exports = { idParam, create, update, changePassword };
