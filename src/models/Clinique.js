'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Clinique = sequelize.define('Clinique', {
  id_clinique: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  nom: {
    type      : DataTypes.STRING(100),
    allowNull : false,
  },
  adresse: {
    type      : DataTypes.TEXT,
    allowNull : true,
  },
  logo_path: {
    type      : DataTypes.STRING(255),
    allowNull : true,
    comment   : 'Chemin relatif vers le logo — géré par uploads/logos/',
  },
  site_web: {
    type      : DataTypes.STRING(255),
    allowNull : true,
  },
}, {
  tableName  : 'clinique',
  timestamps : false,
});

module.exports = Clinique;