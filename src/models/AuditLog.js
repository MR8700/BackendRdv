'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id_log: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  horodatage: {
    type         : DataTypes.DATE,
    allowNull    : false,
    defaultValue : DataTypes.NOW,
  },
  id_user: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'utilisateurs', key: 'id_user' },
    onDelete   : 'SET NULL',
  },
  action_type: {
    type      : DataTypes.STRING(50),
    allowNull : true,
  },
  table_nom: {
    type      : DataTypes.STRING(50),
    allowNull : true,
  },
  description_details: {
    type      : DataTypes.JSON,
    allowNull : true,
  },
  adresse_ip: {
    type      : DataTypes.STRING(45),
    allowNull : true,
    comment   : 'IPv4 (max 15 chars) ou IPv6 (max 45 chars) — validé par trigger SQL',
    validate  : {
      isIP(value) {
        if (value && !/^(\d{1,3}\.){3}\d{1,3}$/.test(value) &&
            !/^[0-9a-fA-F:]+$/.test(value)) {
          throw new Error('Format d\'adresse IP invalide.');
        }
      },
    },
  },
}, {
  tableName  : 'audit_logs',
  timestamps : false,
  // Lecture seule recommandée — l'écriture passe par audit.middleware.js
  // ou par les triggers SQL directement
});

module.exports = AuditLog;