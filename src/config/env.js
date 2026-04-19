'use strict';

const path = require('path');

// dotenv disabled in production - use platform env vars only
// dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'production';

const REQUIRED_VARS_DEV = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'JWT_SECRET', 'JWT_EXPIRES_IN',
  'JWT_REFRESH_SECRET', 'JWT_REFRESH_EXPIRES_IN'
];

const REQUIRED_VARS_PROD = [
  ...REQUIRED_VARS_DEV,
  'REDIS_URL', 'JWT_BLACKLIST_SECRET', 'RENDER_DISK_PATH'
];

const REQUIRED_VARS = NODE_ENV === 'production' ? REQUIRED_VARS_PROD : REQUIRED_VARS_DEV;

const missing = REQUIRED_VARS.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `\n[ENV] Variables manquantes [${NODE_ENV}]: ${missing.join(', ')}\n` +
    'Utilisez src/config/env.prod.example pour reference.\n'
  );
  process.exit(1);
}

module.exports = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT || '3000', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',

  // Render Cloud
  render: {
    diskPath: process.env.RENDER_DISK_PATH || '/tmp/uploads',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT Blacklist
  jwtBlacklist: {
    secret: process.env.JWT_BLACKLIST_SECRET,
  },

  // Database
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: NODE_ENV === 'production',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || (NODE_ENV === 'production' ? '20' : '10'), 10),
      min: parseInt(process.env.DB_POOL_MIN || (NODE_ENV === 'production' ? '5' : '2'), 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '30000', 10),
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Uploads
  upload: {
    baseDir: process.env.UPLOAD_BASE_DIR || 'uploads',
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '5', 10),
    allowedMimes: (process.env.UPLOAD_ALLOWED_MIMES || 'image/jpeg,image/png,image/webp').split(','),
  },

  // Mail
  mail: {
    enabled: process.env.MAIL_ENABLED === 'true',
    token: process.env.MAIL_TOKEN || '',
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@clinique.app',
    fromName: process.env.MAIL_FROM_NAME || 'Clinique',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxAuth: parseInt(process.env.RATE_LIMIT_MAX_AUTH || '5', 10),
    maxApi: parseInt(process.env.RATE_LIMIT_MAX_API || (NODE_ENV === 'production' ? '200' : '100'), 10),
  },

  // CORS
  cors: {
    origins: (process.env.CORS_ORIGINS || (
      NODE_ENV === 'production' 
        ? 'https://*.onrender.com' 
        : 'http://localhost:3000,http://10.0.2.2:3000,http://localhost:5173'
    )).split(',').map(u => u.trim()),
  },

  // Logs
  log: {
    level: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'warn' : 'debug'),
    dir: process.env.LOG_DIR || 'logs',
  },

  // Production runtime check (called from package.json prod:check)
  ...(NODE_ENV === 'production' && {
    checkProductionEnv() {
      const prodMissing = ['REDIS_URL', 'JWT_BLACKLIST_SECRET', 'RENDER_DISK_PATH'].filter(
        key => !process.env[key]
      );
      if (prodMissing.length > 0) {
        console.error(`[PROD] Critical vars missing: ${prodMissing.join(', ')}`);
        console.error('See src/config/env.prod.example');
        process.exit(1);
      }
      console.log('[PROD] Environment OK');
    }
  })
};

