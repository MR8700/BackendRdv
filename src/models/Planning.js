'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Planning = sequelize.define('Planning', {
  id_planning: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  id_medecin: {
    type       : DataTypes.INTEGER,
    allowNull  : false,
    references : { model: 'medecins', key: 'id_user' },
    onDelete   : 'CASCADE',
  },
  id_service: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'services', key: 'id_service' },
    onDelete   : 'SET NULL',
  },
  derniere_maj: {
    type         : DataTypes.DATE,
    allowNull    : false,
    defaultValue : DataTypes.NOW,
  },
}, {
  tableName  : 'plannings',
  timestamps : false,
});

module.exports = Planning;