'use strict';

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { rateLimit: rateCfg } = require('../config/env');

function rateLimitHandler(req, res) {
  return res.status(429).json({
    success    : false,
    message    : 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
    code       : 'RATE_LIMIT_EXCEEDED',
    retryAfter : Math.ceil(rateCfg.windowMs / 1000 / 60) + ' minutes',
  });
}

const authLimiter = rateLimit({
  windowMs             : rateCfg.windowMs,
  max                  : rateCfg.maxAuth,
  standardHeaders      : true,
  legacyHeaders        : false,
  skipSuccessfulRequests: true,
  keyGenerator         : (req) => {
    const login = req.body?.login || 'unknown';
    return `auth:${ipKeyGenerator(req)}:${login}`;
  },
  handler: rateLimitHandler,
});

const apiLimiter = rateLimit({
  windowMs       : rateCfg.windowMs,
  max            : rateCfg.maxApi,
  standardHeaders: true,
  legacyHeaders  : false,
  keyGenerator   : (req) => `api:${ipKeyGenerator(req)}`,
  handler        : rateLimitHandler,
});

const uploadLimiter = rateLimit({
  windowMs       : rateCfg.windowMs,
  max            : 20,
  standardHeaders: true,
  legacyHeaders  : false,
  keyGenerator   : (req) => `upload:${ipKeyGenerator(req)}`,
  handler        : rateLimitHandler,
});

module.exports = { authLimiter, apiLimiter, uploadLimiter };