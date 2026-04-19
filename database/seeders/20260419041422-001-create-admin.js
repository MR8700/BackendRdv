'use strict';

/** @type {import('sequelize-cli').Migration} */
const { hashPassword } = require('../../src/utils/hash.util');

module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPassword = await hashPassword('Admin1234!');
    
    await queryInterface.bulkInsert('Utilisateur', [{
      login: 'admin',
      password_hash: hashedPassword,
      nom: 'Administrateur',
      prenom: 'Principal',
      email: 'admin@clinique.local',
      type_user: 'administrateur',
      statut: 'actif',
      id_role: 1,
      date_creation: new Date()
    }], {});

    console.log('[SEEDER] ✅ Admin créé: login=admin');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Utilisateur', {
      login: 'admin'
    }, {});
  }
};

