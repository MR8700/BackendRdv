'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Secretaire = sequelize.define('Secretaire', {
  id_user: {
    type       : DataTypes.INTEGER,
    primaryKey : true,
    references : { model: 'utilisateurs', key: 'id_user' },
    onDelete   : 'CASCADE',
  },
  id_service_affecte: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'services', key: 'id_service' },
  },
}, {
  tableName  : 'secretaires',
  timestamps : false,
});

module.exports = Secretaire;