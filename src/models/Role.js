'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
  id_role: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  nom_role: {
    type      : DataTypes.STRING(50),
    allowNull : false,
    unique    : true,
  },
  description: {
    type      : DataTypes.TEXT,
    allowNull : true,
  },
}, {
  tableName  : 'roles',
  timestamps : false,
});

module.exports = Role;