'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SecretaireService = sequelize.define('SecretaireService', {
  id_user: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'secretaires', key: 'id_user' },
    onDelete: 'CASCADE',
  },
  id_service: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'services', key: 'id_service' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'secretaire_services',
  timestamps: false,
});

module.exports = SecretaireService;
