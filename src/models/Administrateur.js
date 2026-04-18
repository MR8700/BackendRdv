'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Administrateur = sequelize.define('Administrateur', {
  id_user: {
    type       : DataTypes.INTEGER,
    primaryKey : true,
    references : { model: 'utilisateurs', key: 'id_user' },
    onDelete   : 'CASCADE',
  },
  niveau_acces: {
    type         : DataTypes.INTEGER,
    allowNull    : false,
    defaultValue : 1,
    comment      : '1 = standard, 2 = super-admin',
  },
}, {
  tableName  : 'administrateurs',
  timestamps : false,
});

module.exports = Administrateur;