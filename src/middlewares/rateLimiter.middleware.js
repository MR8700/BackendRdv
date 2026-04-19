'use strict';

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { rateLimit: rateCfg } = require('../config/env');
const { getRedis } = require('../config/redis');

/**
 * =========================
 * HANDLER GLOBAL
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
 * FACTORY STORE REDIS
 * =========================
 * IMPORTANT : 1 instance par limiter
 */
function createRedisStore(prefix) {
  return {
    async increment(key) {
      const redis = getRedis();
      const fullKey = `${prefix}:${key}`;

      const current = await redis.incr(fullKey);

      if (current === 1) {
        await redis.expire(fullKey, Math.floor(rateCfg.windowMs / 1000));
      }

      return {
        totalHits: current,
        resetTime: new Date(Date.now() + rateCfg.windowMs),
      };
    },

    async decrement(key) {
      const redis = getRedis();
      await redis.decr(`${prefix}:${key}`);
    },

    async resetKey(key) {
      const redis = getRedis();
      await redis.del(`${prefix}:${key}`);
    },
  };
}

/**
 * =========================
 * AUTH LIMITER
 * =========================
 */
const authLimiter = rateLimit({
  store: createRedisStore('auth'),
  windowMs: rateCfg.windowMs,
  max: rateCfg.maxAuth,

  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  keyGenerator: (req) => {
    const login = req.body?.login || 'unknown';
    return `${ipKeyGenerator(req)}:${login}`;
  },

  handler: rateLimitHandler,
});

/**
 * =========================
 * API LIMITER
 * =========================
 */
const apiLimiter = rateLimit({
  store: createRedisStore('api'),
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
  store: createRedisStore('upload'),
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