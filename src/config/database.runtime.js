'use strict';

const { Sequelize } = require('sequelize');
const { db, NODE_ENV } = require('./env');
const logger = require('../utils/prodLogger').logger;

const sequelize = new Sequelize(db.name, db.user, db.password, {
  host: db.host,
  port: db.port,
  dialect: 'mysql',
  ssl: NODE_ENV === 'production' ? 'Amazon RDS' : undefined,

  dialectOptions: {
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true,
    typeCast: true,
    ssl: NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : undefined,
  },

  define: {
    charset: 'utf8mb4',
    engine: 'InnoDB',
    underscored: false,
    freezeTableName: true,
    timestamps: false,
  },

  pool: db.pool,
  logging: NODE_ENV === 'development' ? logger.debug : false,
  timezone: '+00:00',
});

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectDB() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info(`[DB] ✅ Connecté ${db.name}@${db.host}:${db.port}`);
      return;
    } catch (err) {
      logger.warn(`[DB] Tentative ${attempt}/${MAX_RETRIES}: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        logger.error('[DB] ❌ Impossible de se connecter - arrèt');
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
}

module.exports = { sequelize, connectDB };

