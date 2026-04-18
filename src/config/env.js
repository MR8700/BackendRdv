'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRES_IN',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `\n[ENV] Variables manquantes : ${missing.join(', ')}\n` +
      '      Copiez .env.example vers .env et renseignez toutes les valeurs.\n'
  );
  process.exit(1);
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',

  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  upload: {
    baseDir: process.env.UPLOAD_BASE_DIR || 'uploads',
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '5', 10),
    allowedMimes: (process.env.UPLOAD_ALLOWED_MIMES || 'image/jpeg,image/png,image/webp').split(','),
  },

  mail: {
    enabled: String(process.env.MAIL_ENABLED || 'false').toLowerCase() === 'true',
    token: process.env.MAIL_TOKEN || '',
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'hello@demomailtrap.co',
    fromName: process.env.MAIL_FROM_NAME || 'Clinique',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxAuth: parseInt(process.env.RATE_LIMIT_MAX_AUTH || '10', 10),
    maxApi: parseInt(process.env.RATE_LIMIT_MAX_API || '100', 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://10.0.2.2:3000').split(',').map((u) => u.trim()),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },
};
