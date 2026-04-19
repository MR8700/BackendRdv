'use strict';

const { v4: uuid } = require('uuid');
const { setRequestId } = require('../utils/prodLogger');

module.exports = function requestIdMiddleware(req, res, next) {
  const reqId = req.get('X-Request-ID') || req.id || uuid();
  req.id = reqId;
  res.set('X-Request-ID', reqId);
  setRequestId(reqId);
  next();
};

