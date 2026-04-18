'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Utilisateur = sequelize.define('Utilisateur', {
  id_user: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  login: {
    type      : DataTypes.STRING(50),
    allowNull : false,
    unique    : true,
  },
  password_hash: {
    type      : DataTypes.STRING(255),
    allowNull : false,
  },
  salt: {
    type      : DataTypes.STRING(255),
    allowNull : true,
  },
  nom: {
    type      : DataTypes.STRING(100),
    allowNull : false,
  },
  prenom: {
    type      : DataTypes.STRING(100),
    allowNull : false,
  },
  email: {
    type      : DataTypes.STRING(100),
    allowNull : true,
    unique    : true,
  },
  photo_path: {
    type      : DataTypes.STRING(255),
    allowNull : true,
    comment   : 'Chemin relatif vers la photo — géré par uploads/photos/',
  },
  id_role: {
    type       : DataTypes.INTEGER,
    allowNull  : true,
    references : { model: 'roles', key: 'id_role' },
  },
  type_user: {
    type      : DataTypes.ENUM('patient', 'medecin', 'secretaire', 'administrateur'),
    allowNull : false,
  },
  statut: {
    type         : DataTypes.ENUM('actif', 'archive', 'suspendu'),
    allowNull    : false,
    defaultValue : 'actif',
  },
  date_creation: {
    type         : DataTypes.DATE,
    allowNull    : false,
    defaultValue : DataTypes.NOW,
  },
  date_archivage: {
    type      : DataTypes.DATE,
    allowNull : true,
  },
}, {
  tableName  : 'utilisateurs',
  timestamps : false,
  // Ne jamais retourner password_hash et salt dans les réponses JSON
  defaultScope: {
    attributes: { exclude: ['password_hash', 'salt'] },
  },
  scopes: {
    // Scope explicite pour les opérations d'authentification uniquement
    withPassword: { attributes: {} },
  },
});

module.exports = Utilisateur;