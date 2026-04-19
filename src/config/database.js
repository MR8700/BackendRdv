'use strict';

const { Sequelize } = require('sequelize');
const { db, NODE_ENV } = require('./env');

const sequelize = new Sequelize(db.name, db.user, db.password, {
  host: db.host,
  port: db.port,
  dialect: 'mysql',

  dialectOptions: {
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true,
    typeCast: true,
  },

  define: {
    charset: 'utf8mb4',
    engine: 'InnoDB',
    underscored: false,
    freezeTableName: true,
    timestamps: false,
  },

  pool: {
    max: db.pool.max,
    min: db.pool.min,
    acquire: db.pool.acquire,
    idle: db.pool.idle,
  },

  logging:
    NODE_ENV === 'development'
      ? (sql) => console.log(`[SQL] ${sql}`)
      : false,

  timezone: '+00:00',
});

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function columnExists(table, column) {
  const [rows] = await sequelize.query(`
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '${table}'
      AND COLUMN_NAME = '${column}'
  `);

  return rows[0].count > 0;
}

/**
 * SAFE ALTER TABLE (MySQL compatible)
 */
async function addColumnIfNotExists(table, columnDefinition) {
  const exists = await columnExists(table, columnDefinition.name);

  if (!exists) {
    await sequelize.query(`
      ALTER TABLE ${table}
      ADD COLUMN ${columnDefinition.sql}
    `);
    console.log(`[DB] Column ajoutée: ${table}.${columnDefinition.name}`);
  }
}

/**
 * ARCHIVE COLUMN SAFE
 */
async function ensureRendezVousArchiveColumns() {
  await addColumnIfNotExists('rendez_vous', {
    name: 'date_archivage',
    sql: 'date_archivage DATETIME NULL AFTER date_enregistrement',
  });
}

/**
 * NOTIFICATIONS COLUMNS SAFE
 */
async function ensureNotificationColumns() {
  await addColumnIfNotExists('notifications', {
    name: 'source_notification_id',
    sql: 'source_notification_id INT NULL AFTER id_user',
  });

  await addColumnIfNotExists('notifications', {
    name: 'recipient_user_id',
    sql: 'recipient_user_id INT NULL AFTER source_notification_id',
  });

  await addColumnIfNotExists('notifications', {
    name: 'created_by_user_id',
    sql: 'created_by_user_id INT NULL AFTER recipient_user_id',
  });
}

/**
 * TRIGGERS SAFE (idempotent)
 */
async function ensureAuditLogTriggers() {
  const statements = [
    `DROP TRIGGER IF EXISTS trg_check_ip_format_insert`,
    `DROP TRIGGER IF EXISTS trg_check_ip_format_update`,

    `
    CREATE TRIGGER trg_check_ip_format_insert
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    BEGIN
      IF NEW.adresse_ip IS NOT NULL
        AND NEW.adresse_ip <> ''
        AND INET6_ATON(NEW.adresse_ip) IS NULL THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Format IP invalide';
      END IF;
    END
    `,

    `
    CREATE TRIGGER trg_check_ip_format_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    BEGIN
      IF NEW.adresse_ip IS NOT NULL
        AND NEW.adresse_ip <> ''
        AND INET6_ATON(NEW.adresse_ip) IS NULL THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Format IP invalide';
      END IF;
    END
    `,
  ];

  for (const sql of statements) {
    await sequelize.query(sql);
  }

  console.log('[DB] Triggers audit_logs OK');
}

/**
 * CONNECT DB WITH RETRY
 */
async function connectDB() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();

      await ensureRendezVousArchiveColumns();
      await ensureNotificationColumns();
      await ensureAuditLogTriggers();

      console.log(
        `[DB] Connecté à ${db.name} sur ${db.host}:${db.port}`
      );

      return;
    } catch (err) {
      console.error(
        `[DB] Tentative ${attempt}/${MAX_RETRIES} : ${err.message}`
      );

      if (attempt === MAX_RETRIES) {
        console.error('[DB] DB inaccessible → arrêt serveur');
        process.exit(1);
      }

      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

/**
 * DEV ONLY SYNC
 */
async function syncDB({ force = false, alter = false } = {}) {
  if (NODE_ENV === 'production') {
    console.warn('[DB] sync ignoré en production');
    return;
  }

  require('../models');

  await sequelize.sync({ force, alter });

  await ensureRendezVousArchiveColumns();
  await ensureNotificationColumns();
  await ensureAuditLogTriggers();

  console.log(`[DB] Sync OK (force=${force}, alter=${alter})`);
}

module.exports = {
  sequelize,
  connectDB,
  syncDB,
};