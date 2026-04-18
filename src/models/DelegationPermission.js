'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DelegationPermission = sequelize.define('DelegationPermission', {
  id_medecin: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'medecins', key: 'id_user' },
    onDelete: 'CASCADE',
  },
  id_secretaire: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'secretaires', key: 'id_user' },
    onDelete: 'CASCADE',
  },
  id_permission: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'permissions', key: 'id_permission' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'delegation_permissions',
  timestamps: false,
});

module.exports = DelegationPermission;
