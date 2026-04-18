'use strict';

const { Sequelize } = require('sequelize');
const { db, NODE_ENV } = require('./env');

const sequelize = new Sequelize(db.name, db.user, db.password, {
  host   : db.host,
  port   : db.port,
  dialect: 'mysql',

  dialectOptions: {
    charset           : 'utf8mb4',
    supportBigNumbers : true,
    bigNumberStrings  : true,
    dateStrings       : true,
    typeCast          : true,
  },

  define: {
    charset        : 'utf8mb4',
    engine         : 'InnoDB',
    underscored    : false,
    freezeTableName: true,
    timestamps     : false,
  },

  pool: {
    max    : db.pool.max,
    min    : db.pool.min,
    acquire: db.pool.acquire,
    idle   : db.pool.idle,
  },

  logging: NODE_ENV === 'development'
    ? (sql) => console.log(`[SQL] ${sql}`)
    : false,

  timezone: '+00:00',
});

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function ensureAuditLogTriggers() {
  const statements = [
    'DROP TRIGGER IF EXISTS trg_check_ip_format_insert',
    'DROP TRIGGER IF EXISTS trg_check_ip_format_update',
    `
      CREATE TRIGGER trg_check_ip_format_insert
      BEFORE INSERT ON audit_logs
      FOR EACH ROW
      BEGIN
        IF NEW.adresse_ip IS NOT NULL
          AND NEW.adresse_ip <> ''
          AND INET6_ATON(NEW.adresse_ip) IS NULL THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Format d''adresse IP invalide';
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
            SET MESSAGE_TEXT = 'Format d''adresse IP invalide';
        END IF;
      END
    `,
  ];

  for (const statement of statements) {
    await sequelize.query(statement);
  }

  console.log('[DB] Triggers audit_logs verifies/repares');
}

async function ensureRendezVousArchiveColumns() {
  const statements = [
    `
      ALTER TABLE rendez_vous
      ADD COLUMN IF NOT EXISTS date_archivage DATETIME NULL AFTER date_enregistrement
    `,
  ];

  for (const statement of statements) {
    await sequelize.query(statement);
  }

  console.log('[DB] Colonne date_archivage verifiee sur rendez_vous');
}

async function ensureNotificationColumns() {
  const statements = [
    `
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS source_notification_id INT NULL AFTER id_user
    `,
    `
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS recipient_user_id INT NULL AFTER source_notification_id
    `,
    `
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS created_by_user_id INT NULL AFTER recipient_user_id
    `,
  ];

  for (const statement of statements) {
    await sequelize.query(statement);
  }

  console.log('[DB] Colonnes additionnelles verifiees sur notifications');
}

async function connectDB() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      await ensureRendezVousArchiveColumns();
      await ensureNotificationColumns();
      await ensureAuditLogTriggers();
      console.log(`[DB] Connecte a ${db.name} sur ${db.host}:${db.port}`);
      return;
    } catch (err) {
      console.error(`[DB] Tentative ${attempt}/${MAX_RETRIES} : ${err.message}`);
      if (attempt === MAX_RETRIES) {
        console.error('[DB] Impossible de joindre la base. Arret du serveur.');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

async function syncDB({ force = false, alter = false } = {}) {
  if (NODE_ENV === 'production') {
    console.warn('[DB] sync() ignore en production - utilisez les migrations.');
    return;
  }

  // db:sync appelle directement ce module, donc on charge ici tous les modeles et associations.
  require('../models');

  await sequelize.sync({ force, alter });
  await ensureRendezVousArchiveColumns();
  await ensureNotificationColumns();
  await ensureAuditLogTriggers();
  console.log(`[DB] Sync termine (force=${force}, alter=${alter})`);
}

module.exports = { sequelize, connectDB, syncDB };
