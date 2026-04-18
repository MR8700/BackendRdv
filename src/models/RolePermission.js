'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Table de jonction role_permissions (clé composite id_role + id_permission)
const RolePermission = sequelize.define('RolePermission', {
  id_role: {
    type       : DataTypes.INTEGER,
    primaryKey : true,
    allowNull  : false,
    references : { model: 'roles', key: 'id_role' },
    onDelete   : 'CASCADE',
  },
  id_permission: {
    type       : DataTypes.INTEGER,
    primaryKey : true,
    allowNull  : false,
    references : { model: 'permissions', key: 'id_permission' },
    onDelete   : 'CASCADE',
  },
}, {
  tableName  : 'role_permissions',
  timestamps : false,
});

module.exports = RolePermission;