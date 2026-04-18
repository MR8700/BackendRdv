'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Table de spécialisation — hérite de utilisateurs via id_user (PK = FK)
const Medecin = sequelize.define('Medecin', {
  id_user: {
    type       : DataTypes.INTEGER,
    primaryKey : true,
    references : { model: 'utilisateurs', key: 'id_user' },
    onDelete   : 'CASCADE',
  },
  code_rpps: {
    type      : DataTypes.STRING(20),
    allowNull : false,
    unique    : true,
    comment   : 'Répertoire Partagé des Professionnels de Santé',
  },
  specialite_principale: {
    type      : DataTypes.STRING(100),
    allowNull : true,
  },
}, {
  tableName  : 'medecins',
  timestamps : false,
});

module.exports = Medecin;