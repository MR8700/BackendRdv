'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Disponibilite = sequelize.define('Disponibilite', {
  id_dispo: {
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
    onDelete   : 'CASCADE',
  },
  date_heure_debut: {
    type      : DataTypes.DATE,
    allowNull : false,
  },
  date_heure_fin: {
    type      : DataTypes.DATE,
    allowNull : false,
    // Contrainte SQL CHECK (date_heure_fin > date_heure_debut) gérée côté DB
    // La validation Sequelize ci-dessous en est le miroir côté applicatif
    validate  : {
      isAfterDebut(value) {
        if (new Date(value) <= new Date(this.date_heure_debut)) {
          throw new Error('date_heure_fin doit être postérieure à date_heure_debut.');
        }
      },
    },
  },
  capacite_max: {
    type         : DataTypes.INTEGER,
    allowNull    : false,
    defaultValue : 1,
    validate     : { min: 1 },
  },
  est_libre: {
    type         : DataTypes.BOOLEAN,
    allowNull    : false,
    defaultValue : true,
    comment      : 'Mis à jour automatiquement par les triggers trg_maj_est_libre_*',
  },
}, {
  tableName  : 'disponibilites',
  timestamps : false,
  indexes    : [
    { fields: ['id_medecin'] },
    { fields: ['id_service'] },
  ],
});

module.exports = Disponibilite;