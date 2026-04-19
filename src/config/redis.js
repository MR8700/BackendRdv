'use strict';

const { createClient } = require('redis');
const logger = require('../utils/prodLogger').logger;

let client;

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    logger.warn('⚠️ Redis désactivé (REDIS_URL manquant) - fallback memory');
    return null;
  }

  client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      tls: process.env.NODE_ENV === 'production',
      rejectUnauthorized: false,
    },
  });

  client.on('error', (err) => logger.error('❌ Redis Client Error:', err));
  client.on('connect', () => logger.info('✅ Redis connecté'));
  client.on('ready', () => logger.info('🚀 Redis prêt pour JWT/RateLimit'));
  
  try {
    await client.connect();
    return client;
  } catch (err) {
    logger.error('❌ Redis connection failed:', err);
    return null;
  }
}

function getRedis() {
  if (!client) {
    throw new Error('Redis non initialisé - appelez connectRedis() d\'abord');
  }
  return client;
}

module.exports = {
  connectRedis,
  getRedis,
};

