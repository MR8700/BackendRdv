'use strict';

const { sequelize } = require('../config/database');

// ── Chargement des modèles ────────────────────────────────────────────────────
const Role           = require('./Role');
const Permission     = require('./Permission');
const RolePermission = require('./RolePermission');
const DelegationPermission = require('./DelegationPermission');
const Clinique       = require('./Clinique');
const Service        = require('./Service');
const Utilisateur    = require('./Utilisateur');
const Medecin        = require('./Medecin');
const Secretaire     = require('./Secretaire');
const SecretaireService = require('./SecretaireService');
const Administrateur = require('./Administrateur');
const Patient        = require('./Patient');
const Planning       = require('./Planning');
const Disponibilite  = require('./Disponibilite');
const RendezVous     = require('./RendezVous');
const Notification   = require('./Notification');
const AuditLog       = require('./AuditLog');
const SystemJob      = require('./SystemJob');

// =============================================================================
// ASSOCIATIONS — fidèles au schéma SQL (FK + tables de jonction)
// =============================================================================

// ── 1. RBAC : Role ↔ Permission (n..n via role_permissions) ──────────────────

Role.belongsToMany(Permission, {
  through    : RolePermission,
  foreignKey : 'id_role',
  otherKey   : 'id_permission',
  as         : 'permissions',
});
Permission.belongsToMany(Role, {
  through    : RolePermission,
  foreignKey : 'id_permission',
  otherKey   : 'id_role',
  as         : 'roles',
});

// ── 2. Clinique → Services (1..n) ─────────────────────────────────────────────

Clinique.hasMany(Service, { foreignKey: 'id_clinique', as: 'services', onDelete: 'SET NULL' });
Service.belongsTo(Clinique, { foreignKey: 'id_clinique', as: 'clinique' });

// ── 3. Utilisateur → Rôle (n..1) ─────────────────────────────────────────────

Utilisateur.belongsTo(Role, { foreignKey: 'id_role', as: 'role' });
Role.hasMany(Utilisateur,   { foreignKey: 'id_role', as: 'utilisateurs' });

// ── 4. Spécialisation : Utilisateur → Medecin / Secretaire / Administrateur / Patient
//    (héritage table-par-type — PK de la sous-table = FK vers utilisateurs)

Utilisateur.hasOne(Medecin,        { foreignKey: 'id_user', as: 'profil_medecin',        onDelete: 'CASCADE' });
Utilisateur.hasOne(Secretaire,     { foreignKey: 'id_user', as: 'profil_secretaire',      onDelete: 'CASCADE' });
Utilisateur.hasOne(Administrateur, { foreignKey: 'id_user', as: 'profil_administrateur',  onDelete: 'CASCADE' });
Utilisateur.hasOne(Patient,        { foreignKey: 'id_user', as: 'profil_patient',         onDelete: 'CASCADE' });

Medecin.belongsTo(Utilisateur,        { foreignKey: 'id_user', as: 'utilisateur' });
Secretaire.belongsTo(Utilisateur,     { foreignKey: 'id_user', as: 'utilisateur' });
Administrateur.belongsTo(Utilisateur, { foreignKey: 'id_user', as: 'utilisateur' });
Patient.belongsTo(Utilisateur,        { foreignKey: 'id_user', as: 'utilisateur' });

// ── 5. Secrétaire → Service affecté (n..1) ───────────────────────────────────

Secretaire.belongsTo(Service, { foreignKey: 'id_service_affecte', as: 'service_affecte' });
Service.hasMany(Secretaire,   { foreignKey: 'id_service_affecte', as: 'secretaires' });
Secretaire.belongsToMany(Service, {
  through    : SecretaireService,
  foreignKey : 'id_user',
  otherKey   : 'id_service',
  as         : 'services_affectes',
});
Service.belongsToMany(Secretaire, {
  through    : SecretaireService,
  foreignKey : 'id_service',
  otherKey   : 'id_user',
  as         : 'secretaires_affectes',
});

Medecin.hasMany(DelegationPermission, { foreignKey: 'id_medecin', as: 'delegations_emises', onDelete: 'CASCADE' });
Secretaire.hasMany(DelegationPermission, { foreignKey: 'id_secretaire', as: 'delegations_recues', onDelete: 'CASCADE' });
Permission.hasMany(DelegationPermission, { foreignKey: 'id_permission', as: 'delegations_permissions', onDelete: 'CASCADE' });
DelegationPermission.belongsTo(Medecin, { foreignKey: 'id_medecin', as: 'medecin' });
DelegationPermission.belongsTo(Secretaire, { foreignKey: 'id_secretaire', as: 'secretaire' });
DelegationPermission.belongsTo(Permission, { foreignKey: 'id_permission', as: 'permission' });

// ── 6. Planning (Médecin + Service) ──────────────────────────────────────────

Medecin.hasMany(Planning,  { foreignKey: 'id_medecin', as: 'plannings',  onDelete: 'CASCADE' });
Service.hasMany(Planning,  { foreignKey: 'id_service', as: 'plannings',  onDelete: 'SET NULL' });
Planning.belongsTo(Medecin,{ foreignKey: 'id_medecin', as: 'medecin' });
Planning.belongsTo(Service,{ foreignKey: 'id_service', as: 'service' });

// ── 7. Disponibilités (Médecin + Service) ────────────────────────────────────

Medecin.hasMany(Disponibilite,  { foreignKey: 'id_medecin', as: 'disponibilites', onDelete: 'CASCADE' });
Service.hasMany(Disponibilite,  { foreignKey: 'id_service', as: 'disponibilites', onDelete: 'CASCADE' });
Disponibilite.belongsTo(Medecin,{ foreignKey: 'id_medecin', as: 'medecin' });
Disponibilite.belongsTo(Service,{ foreignKey: 'id_service', as: 'service' });

// ── 8. RendezVous ─────────────────────────────────────────────────────────────

Planning.hasMany(RendezVous,    { foreignKey: 'id_planning', as: 'rendez_vous', onDelete: 'CASCADE' });
Patient.hasMany(RendezVous,     { foreignKey: 'id_patient',  as: 'rendez_vous' });
Medecin.hasMany(RendezVous,     { foreignKey: 'id_medecin',  as: 'rendez_vous' });
Disponibilite.hasMany(RendezVous,{ foreignKey: 'id_dispo',   as: 'rendez_vous' });

RendezVous.belongsTo(Planning,    { foreignKey: 'id_planning', as: 'planning' });
RendezVous.belongsTo(Patient,     { foreignKey: 'id_patient',  as: 'patient' });
RendezVous.belongsTo(Medecin,     { foreignKey: 'id_medecin',  as: 'medecin' });
RendezVous.belongsTo(Disponibilite,{ foreignKey: 'id_dispo',   as: 'disponibilite' });

// ── 9. Notifications ──────────────────────────────────────────────────────────

Utilisateur.hasMany(Notification, { foreignKey: 'id_user', as: 'notifications', onDelete: 'CASCADE' });
Utilisateur.hasMany(Notification, { foreignKey: 'recipient_user_id', as: 'notifications_recues_admin' });
Utilisateur.hasMany(Notification, { foreignKey: 'created_by_user_id', as: 'notifications_emises' });
RendezVous.hasMany(Notification,  { foreignKey: 'id_rdv',  as: 'notifications', onDelete: 'SET NULL' });
Notification.belongsTo(Utilisateur,{ foreignKey: 'id_user', as: 'utilisateur' });
Notification.belongsTo(RendezVous, { foreignKey: 'id_rdv',  as: 'rendez_vous' });
Notification.belongsTo(Utilisateur, { foreignKey: 'recipient_user_id', as: 'recipient_user' });
Notification.belongsTo(Utilisateur, { foreignKey: 'created_by_user_id', as: 'created_by_user' });
Notification.belongsTo(Notification, { foreignKey: 'source_notification_id', as: 'source_notification' });

// ── 10. AuditLog → Utilisateur ────────────────────────────────────────────────

Utilisateur.hasMany(AuditLog, { foreignKey: 'id_user', as: 'audit_logs', onDelete: 'SET NULL' });
AuditLog.belongsTo(Utilisateur,{ foreignKey: 'id_user', as: 'utilisateur' });

// =============================================================================
// Export centralisé — import unique dans tous les controllers / services
// Usage : const { Utilisateur, Medecin, RendezVous } = require('../models');
// =============================================================================

module.exports = {
  sequelize,
  Role,
  Permission,
  RolePermission,
  DelegationPermission,
  Clinique,
  Service,
  Utilisateur,
  Medecin,
  Secretaire,
  SecretaireService,
  Administrateur,
  Patient,
  Planning,
  Disponibilite,
  RendezVous,
  Notification,
  AuditLog,
  SystemJob,
};
