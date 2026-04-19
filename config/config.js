require('dotenv').config({ override: true });

const acquireTimeout = 60000; // 60s for Railway proxy

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    pool: {
      acquire: acquireTimeout,
      idle: 10000
    },
    logging: console.log,
    dialectOptions: {
      connectTimeout: 60000,
      socketTimeout: 60000
    }
  },

  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST || process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    pool: {
      acquire: 30000
    }
  },

  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    pool: {
      max: 20,
      min: 5,
      acquire: acquireTimeout,
      idle: 30000
    },
    logging: false,
    dialectOptions: {
      connectTimeout: 60000,
      socketTimeout: 60000,
      ssl: {
        rejectUnauthorized: false
      },
      // Railway proxy TCP keepalive
      keepAliveInitialDelayMillis: 60000
    }
  }
};

