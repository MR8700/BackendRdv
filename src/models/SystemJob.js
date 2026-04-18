'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemJob = sequelize.define('SystemJob', {
  id_job: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  type_tache: {
    type      : DataTypes.STRING(50),
    allowNull : true,
    comment   : 'Ex: envoyer_rappel, nettoyage_archives',
  },
  parametres: {
    type      : DataTypes.JSON,
    allowNull : true,
    comment   : 'Paramètres sérialisés du job — ex: { id_rdv: 42 }',
  },
  statut: {
    type         : DataTypes.ENUM('attente', 'succes', 'echec'),
    allowNull    : false,
    defaultValue : 'attente',
  },
  date_execution_prevue: {
    type      : DataTypes.DATE,
    allowNull : true,
  },
  nombre_tentatives: {
    type         : DataTypes.INTEGER,
    allowNull    : false,
    defaultValue : 0,
  },
}, {
  tableName  : 'system_jobs',
  timestamps : false,
  indexes    : [
    // Index composite défini dans le script SQL (section 8)
    { fields: ['date_execution_prevue', 'statut'] },
  ],
});

module.exports = SystemJob;