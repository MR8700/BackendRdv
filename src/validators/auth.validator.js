'use strict';

const Joi = require('joi');
const { TYPE_USER, GROUPE_SANGUIN } = require('../utils/constants.util');

const login = Joi.object({
  login: Joi.string().max(50).required().messages({
    'string.max': 'Le login ne peut pas depasser 50 caracteres.',
    'any.required': 'Le login est requis.',
  }),
  password: Joi.string().min(6).max(255).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 6 caracteres.',
    'any.required': 'Le mot de passe est requis.',
  }),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Le refresh token est requis.',
  }),
});

const register = Joi.object({
  login: Joi.string().max(50).required().messages({
    'string.max': 'Le login ne peut pas depasser 50 caracteres.',
    'any.required': 'Le login est requis.',
  }),
  password: Joi.string().min(6).max(255).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 6 caracteres.',
    'any.required': 'Le mot de passe est requis.',
  }),
  nom: Joi.string().max(100).required().messages({
    'string.max': 'Le nom ne peut pas depasser 100 caracteres.',
    'any.required': 'Le nom est requis.',
  }),
  prenom: Joi.string().max(100).required().messages({
    'string.max': 'Le prenom ne peut pas depasser 100 caracteres.',
    'any.required': 'Le prenom est requis.',
  }),
  email: Joi.string().email().max(100).optional().messages({
    'string.email': 'L email doit etre un email valide.',
    'string.max': 'L email ne peut pas depasser 100 caracteres.',
  }),
  type_user: Joi.string()
    .valid(TYPE_USER.PATIENT, TYPE_USER.MEDECIN, TYPE_USER.SECRETAIRE)
    .required()
    .messages({
      'any.only': 'Le type utilisateur doit etre patient, medecin ou secretaire.',
      'any.required': 'Le type utilisateur est requis.',
    }),
  code_rpps: Joi.when('type_user', {
    is: TYPE_USER.MEDECIN,
    then: Joi.string().max(20).required().messages({
      'any.required': 'Le code RPPS est requis pour un medecin.',
    }),
    otherwise: Joi.string().max(20).optional().allow('', null),
  }),
  specialite_principale: Joi.string().max(100).optional().allow('', null),
  id_service_affecte: Joi.when('type_user', {
    is: TYPE_USER.SECRETAIRE,
    then: Joi.number().integer().positive().optional(),
    otherwise: Joi.number().integer().positive().optional(),
  }),
  id_services_affectes: Joi.when('type_user', {
    is: TYPE_USER.SECRETAIRE,
    then: Joi.array().items(Joi.number().integer().positive()).unique().optional(),
    otherwise: Joi.array().items(Joi.number().integer().positive()).optional(),
  }),
  num_secu_sociale: Joi.when('type_user', {
    is: TYPE_USER.PATIENT,
    then: Joi.string().max(20).optional().allow('', null),
    otherwise: Joi.string().max(20).optional().allow('', null),
  }),
  groupe_sanguin: Joi.when('type_user', {
    is: TYPE_USER.PATIENT,
    then: Joi.string().valid(...Object.values(GROUPE_SANGUIN)).optional().allow(null),
    otherwise: Joi.string().valid(...Object.values(GROUPE_SANGUIN)).optional().allow(null),
  }),
});

module.exports = { login, refresh, register };
