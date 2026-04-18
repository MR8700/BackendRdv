'use strict';

const { Medecin, Utilisateur, Planning, Disponibilite, Service, Role, Secretaire, Permission, DelegationPermission } = require('../models');
const { ok, paginated, notFound } = require('../utils/response.util');
const { AppError } = require('../middlewares/errorHandler.middleware');
const { auditManual } = require('../middlewares/audit.middleware');

function ensureMedecinScope(req, medecinId) {
  if (req.user.type_user !== 'administrateur' && req.user.id_user !== Number(medecinId)) {
    throw new AppError('Acces refuse.', 403, 'FORBIDDEN');
  }
}

async function getDoctorDelegablePermissions(medecinId) {
  const medecin = await Medecin.findByPk(medecinId, {
    include: [{
      model: Utilisateur,
      as: 'utilisateur',
      include: [{
        model: Role,
        as: 'role',
        include: [{ model: Permission, as: 'permissions' }],
      }],
    }],
  });

  if (!medecin) throw new AppError('Medecin introuvable.', 404, 'NOT_FOUND');
  return medecin.utilisateur?.role?.permissions || [];
}

async function getDoctorServiceIds(medecinId) {
  const [plannings, disponibilites] = await Promise.all([
    Planning.findAll({ where: { id_medecin: medecinId }, attributes: ['id_service'] }),
    Disponibilite.findAll({ where: { id_medecin: medecinId }, attributes: ['id_service'] }),
  ]);

  return [...new Set(
    [...plannings, ...disponibilites]
      .map((item) => item.id_service)
      .filter(Boolean)
  )];
}

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, specialite, delegated_only } = req.query;
    const where = {};
    if (specialite) where.specialite_principale = specialite;

    if (req.user.type_user === 'secretaire' && delegated_only === 'true') {
      const delegations = await DelegationPermission.findAll({
        where: { id_secretaire: req.user.id_user },
        attributes: ['id_medecin'],
      });

      const doctorIds = [...new Set(delegations.map((delegation) => delegation.id_medecin).filter(Boolean))];
      if (doctorIds.length === 0) {
        return paginated(res, [], 0, page, limit);
      }
      where.id_user = doctorIds;
    }

    const { count, rows } = await Medecin.findAndCountAll({
      where,
      include: [{
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_path', 'statut'],
        include: [{ model: Role, as: 'role', attributes: ['nom_role'] }],
      }],
      order: [[{ model: Utilisateur, as: 'utilisateur' }, 'nom', 'ASC']],
      limit: parseInt(limit, 10),
      offset: (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const medecin = await Medecin.findByPk(req.params.id_user, {
      include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_path', 'statut'] }],
    });
    if (!medecin) return notFound(res, 'Medecin');
    return ok(res, medecin);
  } catch (err) { next(err); }
}

async function getDisponibilites(req, res, next) {
  try {
    const { page = 1, limit = 50, libre_seulement } = req.query;
    const where = { id_medecin: req.params.id_user };
    if (libre_seulement === 'true') where.est_libre = true;

    const { count, rows } = await Disponibilite.findAndCountAll({
      where,
      include: [{ model: Service, as: 'service', attributes: ['nom_service'] }],
      order: [['date_heure_debut', 'ASC']],
      limit: parseInt(limit, 10),
      offset: (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function getPlannings(req, res, next) {
  try {
    const plannings = await Planning.findAll({
      where: { id_medecin: req.params.id_user },
      include: [{ model: Service, as: 'service', attributes: ['nom_service', 'id_service'] }],
      order: [['derniere_maj', 'DESC']],
    });
    return ok(res, plannings);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const medecin = await Medecin.findByPk(req.params.id_user);
    if (!medecin) return notFound(res, 'Medecin');
    ensureMedecinScope(req, medecin.id_user);
    const { specialite_principale, code_rpps } = req.body;
    await medecin.update({ specialite_principale, code_rpps });
    await auditManual(req, 'UPDATE_MEDECIN', 'medecins', { id_user: medecin.id_user });
    return ok(res, medecin, 'Profil medecin mis a jour.');
  } catch (err) { next(err); }
}

async function getDelegations(req, res, next) {
  try {
    const medecinId = Number(req.params.id_user);
    ensureMedecinScope(req, medecinId);

    const [permissions, serviceIds, delegations] = await Promise.all([
      getDoctorDelegablePermissions(medecinId),
      getDoctorServiceIds(medecinId),
      DelegationPermission.findAll({
        where: { id_medecin: medecinId },
        include: [{ model: Permission, as: 'permission', attributes: ['id_permission'] }],
      }),
    ]);

    const selectedMap = delegations.reduce((acc, delegation) => {
      acc[delegation.id_secretaire] = acc[delegation.id_secretaire] || [];
      if (delegation.permission) acc[delegation.id_secretaire].push(delegation.permission.id_permission);
      return acc;
    }, {});

    const secretaires = await Secretaire.findAll({
      include: [
        { model: Utilisateur, as: 'utilisateur', attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_path', 'statut'] },
        { model: Service, as: 'service_affecte', attributes: ['id_service', 'nom_service'] },
        { model: Service, as: 'services_affectes', attributes: ['id_service', 'nom_service'], through: { attributes: [] } },
      ],
      order: [[{ model: Utilisateur, as: 'utilisateur' }, 'nom', 'ASC']],
    });

    const scopedSecretaires = secretaires.filter((secretaire) => {
      const assignedServiceIds = [
        ...(secretaire.services_affectes?.map((service) => service.id_service) || []),
        ...(secretaire.id_service_affecte ? [secretaire.id_service_affecte] : []),
      ];

      if (serviceIds.length === 0) return assignedServiceIds.length > 0;
      return assignedServiceIds.some((id) => serviceIds.includes(id));
    });

    return ok(res, {
      permissions,
      secretaires: scopedSecretaires.map((secretaire) => ({
        ...secretaire.toJSON(),
        selected_permission_ids: selectedMap[secretaire.id_user] || [],
      })),
    });
  } catch (err) { next(err); }
}

async function updateDelegation(req, res, next) {
  try {
    const medecinId = Number(req.params.id_user);
    const secretaireId = Number(req.params.id_secretaire);
    ensureMedecinScope(req, medecinId);

    const permissionIds = Array.isArray(req.body.permission_ids)
      ? [...new Set(req.body.permission_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
      : [];

    const [delegablePermissions, serviceIds, secretaire] = await Promise.all([
      getDoctorDelegablePermissions(medecinId),
      getDoctorServiceIds(medecinId),
      Secretaire.findByPk(secretaireId, {
        include: [{ model: Service, as: 'services_affectes', attributes: ['id_service'], through: { attributes: [] } }],
      }),
    ]);

    if (!secretaire) return notFound(res, 'Secretaire');

    const secretaryServiceIds = [
      ...(secretaire.services_affectes?.map((service) => service.id_service) || []),
      ...(secretaire.id_service_affecte ? [secretaire.id_service_affecte] : []),
    ];

    if (serviceIds.length > 0 && !secretaryServiceIds.some((id) => serviceIds.includes(id))) {
      throw new AppError('Ce secretaire n est rattache a aucun service de ce medecin.', 403, 'SECRETARY_SCOPE_MISMATCH');
    }

    const allowedPermissionIds = delegablePermissions.map((permission) => permission.id_permission);
    if (permissionIds.some((permissionId) => !allowedPermissionIds.includes(permissionId))) {
      throw new AppError('Le medecin ne peut deleguer que ses propres permissions.', 400, 'INVALID_DELEGATED_PERMISSION');
    }

    await DelegationPermission.destroy({ where: { id_medecin: medecinId, id_secretaire: secretaireId } });

    if (permissionIds.length > 0) {
      await DelegationPermission.bulkCreate(
        permissionIds.map((id_permission) => ({
          id_medecin: medecinId,
          id_secretaire: secretaireId,
          id_permission,
        }))
      );
    }

    await auditManual(req, 'UPDATE_MEDECIN_DELEGATIONS', 'delegation_permissions', {
      id_medecin: medecinId,
      id_secretaire: secretaireId,
      permission_count: permissionIds.length,
    });

    return ok(res, { id_secretaire: secretaireId, permission_ids: permissionIds }, 'Delegations mises a jour.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, getDisponibilites, getPlannings, update, getDelegations, updateDelegation };
