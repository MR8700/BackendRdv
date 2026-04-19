'use strict';

 // dotenv disabled - use environment variables (seed only for dev now)
const { sequelize, connectDB } = require('../config/database');
const { hashPassword } = require('../utils/hash.util');

const ROLES = [
  { nom_role: 'administrateur', description: 'Acces total au systeme' },
  { nom_role: 'medecin', description: 'Gestion des plannings et consultations' },
  { nom_role: 'secretaire', description: 'Gestion des rendez-vous et patients' },
  { nom_role: 'patient', description: 'Prise de rendez-vous en ligne' },
];

const PERMISSIONS = [
  { nom_permission: 'voir_utilisateurs', description: 'Lister tous les utilisateurs' },
  { nom_permission: 'creer_utilisateur', description: 'Creer un compte utilisateur' },
  { nom_permission: 'modifier_utilisateur', description: 'Modifier un compte utilisateur' },
  { nom_permission: 'archiver_utilisateur', description: 'Archiver un compte utilisateur' },
  { nom_permission: 'voir_rdv', description: 'Voir les rendez-vous' },
  { nom_permission: 'creer_rdv', description: 'Creer un rendez-vous' },
  { nom_permission: 'confirmer_rdv', description: 'Confirmer ou refuser un RDV' },
  { nom_permission: 'annuler_rdv', description: 'Annuler un rendez-vous' },
  { nom_permission: 'gerer_planning', description: 'Creer et modifier les plannings' },
  { nom_permission: 'voir_disponibilites', description: 'Voir les creneaux disponibles' },
  { nom_permission: 'voir_dossier_medical', description: 'Acceder au dossier medical patient' },
  { nom_permission: 'gerer_clinique', description: 'Modifier les infos de la clinique' },
  { nom_permission: 'gerer_services', description: 'Creer et modifier les services' },
  { nom_permission: 'voir_audit_logs', description: 'Consulter les journaux d audit' },
  { nom_permission: 'envoyer_notification', description: 'Envoyer des notifications' },
  { nom_permission: 'attribuer_permissions', description: 'Attribuer des permissions RBAC aux roles' },
  { nom_permission: 'demander_navigation_compte', description: 'Demander un acces au compte d un utilisateur' },
  { nom_permission: 'forcer_navigation_compte', description: 'Forcer un acces au compte d un utilisateur' },
];

const ROLE_PERMISSIONS = {
  administrateur: [
    'voir_utilisateurs', 'creer_utilisateur', 'modifier_utilisateur', 'archiver_utilisateur',
    'voir_rdv', 'creer_rdv', 'confirmer_rdv', 'annuler_rdv',
    'gerer_planning', 'voir_disponibilites',
    'voir_dossier_medical',
    'gerer_clinique', 'gerer_services',
    'voir_audit_logs', 'envoyer_notification',
    'attribuer_permissions', 'demander_navigation_compte', 'forcer_navigation_compte',
  ],
  medecin: [
    'voir_rdv', 'confirmer_rdv', 'annuler_rdv',
    'gerer_planning', 'voir_disponibilites',
    'voir_dossier_medical',
    'envoyer_notification',
  ],
  secretaire: [
    'voir_utilisateurs',
    'voir_rdv', 'creer_rdv', 'confirmer_rdv', 'annuler_rdv',
    'voir_disponibilites',
    'envoyer_notification',
  ],
  patient: [
    'voir_rdv', 'creer_rdv', 'annuler_rdv',
    'voir_disponibilites',
  ],
};

const CLINIQUE = {
  nom: 'Clinique',
  adresse: 'A configurer',
  site_web: '',
};

const ADMIN_SEED = {
  login: process.env.ADMIN_SEED_LOGIN || 'admin',
  password: process.env.ADMIN_SEED_PASSWORD || 'Admin1234!',
  nom: process.env.ADMIN_SEED_NOM || 'Administrateur',
  prenom: process.env.ADMIN_SEED_PRENOM || 'Principal',
  email: process.env.ADMIN_SEED_EMAIL || 'admin@clinique.local',
  niveau_acces: Number(process.env.ADMIN_SEED_NIVEAU_ACCES || 2),
};

const SERVICES = [
  { nom_service: 'Medecine Generale', description: 'Consultations generales' },
  { nom_service: 'Pediatrie', description: 'Soins pour enfants' },
  { nom_service: 'Gynecologie', description: 'Sante de la femme' },
  { nom_service: 'Cardiologie', description: 'Maladies cardiovasculaires' },
  { nom_service: 'Urgences', description: 'Soins d urgence' },
];

async function seed() {
  await connectDB();
  const t = await sequelize.transaction();

  try {
    console.log('\n[SEED] Initialisation des referentiels...\n');

    const rolesCreated = {};
    for (const role of ROLES) {
      const [savedRole] = await sequelize.models.Role.findOrCreate({
        where: { nom_role: role.nom_role },
        defaults: role,
        transaction: t,
      });
      rolesCreated[role.nom_role] = savedRole;
    }

    const permsCreated = {};
    for (const permission of PERMISSIONS) {
      const [savedPermission] = await sequelize.models.Permission.findOrCreate({
        where: { nom_permission: permission.nom_permission },
        defaults: permission,
        transaction: t,
      });
      permsCreated[permission.nom_permission] = savedPermission;
    }

    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      const role = rolesCreated[roleName];
      await sequelize.models.RolePermission.destroy({
        where: { id_role: role.id_role },
        transaction: t,
      });

      for (const permissionName of permissionNames) {
        await sequelize.models.RolePermission.findOrCreate({
          where: {
            id_role: role.id_role,
            id_permission: permsCreated[permissionName].id_permission,
          },
          transaction: t,
        });
      }
    }

    const [clinique] = await sequelize.models.Clinique.findOrCreate({
      where: { nom: CLINIQUE.nom },
      defaults: CLINIQUE,
      transaction: t,
    });

    for (const service of SERVICES) {
      await sequelize.models.Service.findOrCreate({
        where: { nom_service: service.nom_service },
        defaults: {
          ...service,
          id_clinique: clinique.id_clinique,
        },
        transaction: t,
      });
    }

    const roleAdmin = rolesCreated.administrateur;
    const [adminUser] = await sequelize.models.Utilisateur.findOrCreate({
      where: { login: ADMIN_SEED.login },
      defaults: {
        login: ADMIN_SEED.login,
        password_hash: await hashPassword(ADMIN_SEED.password),
        nom: ADMIN_SEED.nom,
        prenom: ADMIN_SEED.prenom,
        email: ADMIN_SEED.email,
        type_user: 'administrateur',
        statut: 'actif',
        id_role: roleAdmin.id_role,
      },
      transaction: t,
    });

    await sequelize.models.Administrateur.findOrCreate({
      where: { id_user: adminUser.id_user },
      defaults: {
        id_user: adminUser.id_user,
        niveau_acces: ADMIN_SEED.niveau_acces,
      },
      transaction: t,
    });

    await t.commit();
    console.log('[SEED] Referentiels installes.');
    console.log(`[SEED] Administrateur disponible : login=${ADMIN_SEED.login}`);
  } catch (err) {
    await t.rollback();
    console.error('\n[SEED] Erreur :', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  process.exit(0);
}

require('../models');
seed();
