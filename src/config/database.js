'use strict';

const { Sequelize } = require('sequelize');
const { db, NODE_ENV } = require('./env');

const sequelize = new Sequelize(
  db.name,
  db.user,
  db.password,
  {
    host: db.host,
    port: db.port,
    dialect: 'mysql',

    dialectOptions: {
      charset: 'utf8mb4',
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      typeCast: true,
      ssl: db.ssl || (NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
    },

    pool: {
      max: db.pool.max,
      min: db.pool.min,
      acquire: db.pool.acquire,
      idle: db.pool.idle,
    },

    logging: NODE_ENV === 'development' ? (sql) => console.log(`[SQL] ${sql}`) : false,
    timezone: '+00:00',
  }
);

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectDB() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      console.log(`[DB] ✅ Connected to ${db.name}@${db.host}:${db.port}`);
      return;
    } catch (err) {
      console.error(`[DB] Attempt ${attempt}/${MAX_RETRIES}: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        console.error('[DB] ❌ Fatal connection error. Exiting.');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

module.exports = { sequelize, connectDB };

