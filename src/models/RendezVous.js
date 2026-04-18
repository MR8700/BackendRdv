'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RendezVous = sequelize.define('RendezVous', {
  id_rdv: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  id_planning: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'plannings', key: 'id_planning' },
    onDelete   : 'CASCADE',
  },
  id_patient: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'patients', key: 'id_user' },
  },
  id_medecin: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'medecins', key: 'id_user' },
  },
  id_dispo: {
    type       : DataTypes.INTEGER,
    allowNull  : false,
    references : { model: 'disponibilites', key: 'id_dispo' },
  },
  date_heure_rdv: {
    type      : DataTypes.DATE,
    allowNull : false,
  },
  statut_rdv: {
    type         : DataTypes.ENUM('en_attente', 'confirme', 'refuse', 'annule', 'archive'),
    allowNull    : false,
    defaultValue : 'en_attente',
  },
  motif: {
    type      : DataTypes.TEXT,
    allowNull : true,
  },
  signature_electronique: {
    type      : DataTypes.BLOB,
    allowNull : true,
    comment   : 'Preuve de non-répudiation — BLOB signé',
  },
  date_enregistrement: {
    type         : DataTypes.DATE,
    allowNull    : false,
    defaultValue : DataTypes.NOW,
  },
  date_archivage: {
    type      : DataTypes.DATE,
    allowNull : true,
  },
}, {
  tableName  : 'rendez_vous',
  timestamps : false,
  // Indexes définis dans le script SQL (section 9)
  indexes: [
    { fields: ['id_patient'] },
    { fields: ['date_heure_rdv'] },
    { fields: ['id_dispo'] },
  ],
});

module.exports = RendezVous;
