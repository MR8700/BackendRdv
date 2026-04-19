'use strict';

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { rateLimit: rateCfg, render } = require('../config/env');
const logger = require('../utils/prodLogger').logger;

let redisStore;

// Centralized Redis for rate-limit
const RedisStore = require('rate-limit-redis');
const { getRedis } = require('../config/redis');

// Use shared redisClient
const redisStore = new RedisStore({
  client: getRedis(),
  prefix: 'ratelimit:'
});



function rateLimitHandler(req, res) {
  return res.status(429).json({
    success    : false,
    message    : 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
    code       : 'RATE_LIMIT_EXCEEDED',
    retryAfter : Math.ceil(rateCfg.windowMs / 1000 / 60) + ' minutes',
  });
}

const authLimiter = rateLimit({
  store: await getRedisStore(),
  windowMs: rateCfg.windowMs,
  max: rateCfg.maxAuth,
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const login = req.body?.login || 'unknown';
    return `auth:${ipKeyGenerator(req)}:${login}`;
  }
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