'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Permission = sequelize.define('Permission', {
  id_permission: {
    type          : DataTypes.INTEGER,
    primaryKey    : true,
    autoIncrement : true,
  },
  nom_permission: {
    type      : DataTypes.STRING(100),
    allowNull : false,
    unique    : true,
  },
  description: {
    type      : DataTypes.TEXT,
    allowNull : true,
  },
}, {
  tableName  : 'permissions',
  timestamps : false,
});

module.exports = Permission;