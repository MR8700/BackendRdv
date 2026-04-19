'use strict';

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const { rateLimit: rateCfg } = require('../config/env');
const { getRedis } = require('../config/redis');

/**
 * =========================
 * RATE LIMIT HANDLER
 * =========================
 */
function rateLimitHandler(req, res) {
  return res.status(429).json({
    success: false,
    message: 'Trop de requêtes. Réessayez plus tard.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(rateCfg.windowMs / 1000 / 60) + ' minutes',
  });
}

/**
 * =========================
 * REDIS STORE (CUSTOM)
 * =========================
 * Remplace rate-limit-redis (source de bugs)
 */
const redisStore = {
  async increment(key) {
    const redis = getRedis();

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, Math.floor(rateCfg.windowMs / 1000));
    }

    return {
      totalHits: current,
      resetTime: new Date(Date.now() + rateCfg.windowMs),
    };
  },

  async decrement(key) {
    const redis = getRedis();
    await redis.decr(key);
  },

  async resetKey(key) {
    const redis = getRedis();
    await redis.del(key);
  },
};

/**
 * =========================
 * AUTH LIMITER
 * =========================
 */
const authLimiter = rateLimit({
  store: redisStore,
  windowMs: rateCfg.windowMs,
  max: rateCfg.maxAuth,

  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  keyGenerator: (req) => {
    const login = req.body?.login || 'unknown';
    return `auth:${ipKeyGenerator(req)}:${login}`;
  },

  handler: rateLimitHandler,
});

/**
 * =========================
 * API LIMITER
 * =========================
 */
const apiLimiter = rateLimit({
  store: redisStore,
  windowMs: rateCfg.windowMs,
  max: rateCfg.maxApi,

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => `api:${ipKeyGenerator(req)}`,

  handler: rateLimitHandler,
});

/**
 * =========================
 * UPLOAD LIMITER
 * =========================
 */
const uploadLimiter = rateLimit({
  store: redisStore,
  windowMs: rateCfg.windowMs,
  max: 20,

  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => `upload:${ipKeyGenerator(req)}`,

  handler: rateLimitHandler,
});

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
};