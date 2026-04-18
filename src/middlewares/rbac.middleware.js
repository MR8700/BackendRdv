'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Middleware RBAC (Role-Based Access Control)
//
// Aligné sur les tables SQL :
//   `roles`            → nom_role  : 'patient' | 'medecin' | 'secretaire' | 'administrateur'
//   `permissions`      → nom_permission : ex. 'gerer_rdv', 'voir_dossier', ...
//   `role_permissions` → table de jonction rôle ↔ permission
//
// Deux stratégies disponibles :
//   1. checkRole(...roles)       → vérifie le type_user du token (rapide, sans DB)
//   2. checkPermission(...perms) → vérifie les permissions chargées sur req.user
//
// req.user est injecté par authenticate() (auth.middleware.js).
// ─────────────────────────────────────────────────────────────────────────────

// Valeurs exactes de l'ENUM type_user dans la table `utilisateurs`
const TYPE_USER = Object.freeze({
  PATIENT        : 'patient',
  MEDECIN        : 'medecin',
  SECRETAIRE     : 'secretaire',
  ADMINISTRATEUR : 'administrateur',
});

// ─────────────────────────────────────────────────────────────────────────────
// checkRole(...roles)
// Vérifie que req.user.type_user est dans la liste fournie.
// Ne fait aucune requête DB — utilise uniquement le payload JWT.
//
// Usage :
//   router.get('/dossiers', authenticate, checkRole('medecin', 'administrateur'), ...)
// ─────────────────────────────────────────────────────────────────────────────

function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié.',
      });
    }

    if (!roles.includes(req.user.type_user)) {
      return res.status(403).json({
        success : false,
        message : `Accès refusé. Rôles autorisés : ${roles.join(', ')}. ` +
                  `Votre rôle : ${req.user.type_user}.`,
        code    : 'FORBIDDEN_ROLE',
      });
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// checkPermission(...permissions)
// Vérifie que req.user.permissions contient toutes les permissions demandées.
// Les permissions sont chargées dans le token par token.service.js via
// une jointure sur role_permissions → permissions.
//
// Usage :
//   router.delete('/:id', authenticate, checkPermission('supprimer_rdv'), ...)
// ─────────────────────────────────────────────────────────────────────────────

function checkPermission(...requiredPerms) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié.',
      });
    }

    const userPerms = req.user.permissions || [];
    const missing   = requiredPerms.filter((p) => !userPerms.includes(p));

    if (missing.length > 0) {
      return res.status(403).json({
        success    : false,
        message    : `Permission(s) manquante(s) : ${missing.join(', ')}.`,
        code       : 'FORBIDDEN_PERMISSION',
      });
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// isSelf(paramName)
// Vérifie que l'utilisateur connecté accède uniquement à sa propre ressource,
// sauf s'il est administrateur.
//
// Usage :
//   router.get('/:id_user/profil', authenticate, isSelf('id_user'), ...)
// ─────────────────────────────────────────────────────────────────────────────

function isSelf(paramName = 'id_user') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non authentifié.' });
    }

    const isAdmin     = req.user.type_user === TYPE_USER.ADMINISTRATEUR;
    const isSameUser  = String(req.user.id_user) === String(req.params[paramName]);

    if (!isAdmin && !isSameUser) {
      return res.status(403).json({
        success: false,
        message : 'Vous ne pouvez accéder qu\'à votre propre ressource.',
        code    : 'FORBIDDEN_SELF',
      });
    }

    next();
  };
}

module.exports = { checkRole, checkPermission, isSelf, TYPE_USER };