'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id_notif: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  id_user: {
    type       : DataTypes.INTEGER,
    allowNull  : false,
    references : { model: 'utilisateurs', key: 'id_user' },
    onDelete   : 'CASCADE',
  },
  source_notification_id: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'notifications', key: 'id_notif' },
    onDelete   : 'SET NULL',
  },
  recipient_user_id: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'utilisateurs', key: 'id_user' },
    onDelete   : 'SET NULL',
  },
  created_by_user_id: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'utilisateurs', key: 'id_user' },
    onDelete   : 'SET NULL',
  },
  id_rdv: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'rendez_vous', key: 'id_rdv' },
    onDelete   : 'SET NULL',
  },
  type_notification: {
    type         : DataTypes.ENUM('rappel', 'urgence', 'information'),
    allowNull    : false,
    defaultValue : 'information',
  },
  message: {
    type      : DataTypes.TEXT,
    allowNull : false,
  },
  lu: {
    type         : DataTypes.BOOLEAN,
    allowNull    : false,
    defaultValue : false,
  },
  date_envoi: {
    type         : DataTypes.DATE,
    allowNull    : false,
    defaultValue : DataTypes.NOW,
  },
}, {
  tableName  : 'notifications',
  timestamps : false,
});

module.exports = Notification;
