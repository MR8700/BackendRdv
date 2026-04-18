'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Patient = sequelize.define('Patient', {
  id_user: {
    type       : DataTypes.INTEGER,
    primaryKey : true,
    references : { model: 'utilisateurs', key: 'id_user' },
    onDelete   : 'CASCADE',
  },
  num_secu_sociale: {
    type      : DataTypes.STRING(20),
    allowNull : true,
    unique    : true,
  },
  groupe_sanguin: {
    type      : DataTypes.STRING(5),
    allowNull : true,
    comment   : 'Ex: A+, B-, O+, AB+',
  },
  id_dossier_medical: {
    type      : DataTypes.STRING(50),
    allowNull : true,
    unique    : true,
    comment   : 'UUID généré par uuid.util.js à la création du patient',
  },
}, {
  tableName  : 'patients',
  timestamps : false,
});

module.exports = Patient;