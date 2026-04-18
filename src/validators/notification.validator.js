'use strict';

const Joi = require('joi');
const { TYPE_NOTIFICATION } = require('../utils/constants.util');

const create = Joi.object({
  id_user          : Joi.number().integer().positive().required(),
  id_rdv           : Joi.number().integer().positive().optional(),
  type_notification: Joi.string().valid(...Object.values(TYPE_NOTIFICATION)).required(),
  message          : Joi.string().max(2000).required(),
});

const idParam = Joi.object({
  id_notif: Joi.number().integer().positive().required(),
});

const query = Joi.object({
  page              : Joi.number().integer().min(1).default(1),
  limit             : Joi.number().integer().min(1).max(100).default(20),
  lu                : Joi.boolean().optional(),
  type_notification : Joi.string().valid(...Object.values(TYPE_NOTIFICATION)).optional(),
});

const markRecipientRead = Joi.object({
  id_notif: Joi.number().integer().positive().required(),
});

module.exports = { create, idParam, query, markRecipientRead };
