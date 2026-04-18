'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define('Service', {
  id_service: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  nom_service: {
    type      : DataTypes.STRING(100),
    allowNull : false,
  },
  image_path: {
    type      : DataTypes.STRING(255),
    allowNull : true,
    comment   : 'Chemin relatif vers l\'image — géré par uploads/services/',
  },
  description: {
    type      : DataTypes.TEXT,
    allowNull : true,
  },
  id_clinique: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'clinique', key: 'id_clinique' },
  },
}, {
  tableName  : 'services',
  timestamps : false,
});

module.exports = Service;