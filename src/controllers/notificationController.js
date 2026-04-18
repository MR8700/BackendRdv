'use strict';

const { Notification, Utilisateur } = require('../models');
const { ok, created, paginated, notFound } = require('../utils/response.util');
const { AppError } = require('../middlewares/errorHandler.middleware');
const { createInternalNotification } = require('../services/email.service');
const { TYPE_USER } = require('../utils/constants.util');

const notificationIncludes = [
  { model: Utilisateur, as: 'utilisateur', attributes: ['id_user', 'nom', 'prenom', 'type_user'] },
  { model: Utilisateur, as: 'recipient_user', attributes: ['id_user', 'nom', 'prenom', 'type_user'] },
  { model: Utilisateur, as: 'created_by_user', attributes: ['id_user', 'nom', 'prenom', 'type_user'] },
];

async function getMine(req, res, next) {
  try {
    const { page = 1, limit = 20, lu, type_notification } = req.query;
    const where = { id_user: req.user.id_user };
    if (lu !== undefined) where.lu = lu === 'true';
    if (type_notification) where.type_notification = type_notification;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      include: notificationIncludes,
      order: [['date_envoi', 'DESC']],
      limit: parseInt(limit, 10),
      offset: (page - 1) * limit,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) { next(err); }
}

async function markAsRead(req, res, next) {
  try {
    const notif = await Notification.findByPk(req.params.id_notif);
    if (!notif) return notFound(res, 'Notification');
    if (notif.id_user !== req.user.id_user) {
      throw new AppError('Acces refuse.', 403, 'FORBIDDEN');
    }
    await notif.update({ lu: true });
    return ok(res, null, 'Notification marquee comme lue.');
  } catch (err) { next(err); }
}

async function markAllAsRead(req, res, next) {
  try {
    await Notification.update({ lu: true }, { where: { id_user: req.user.id_user, lu: false } });
    return ok(res, null, 'Toutes les notifications marquees comme lues.');
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const notif = await createInternalNotification({
      id_user: req.body.id_user,
      id_rdv: req.body.id_rdv ?? null,
      type_notification: req.body.type_notification,
      message: req.body.message,
      created_by_user_id: req.user.id_user,
    });
    return created(res, notif, 'Notification creee.');
  } catch (err) { next(err); }
}

async function markRecipientAsRead(req, res, next) {
  try {
    if (req.user.type_user !== TYPE_USER.ADMINISTRATEUR) {
      throw new AppError('Acces reserve aux administrateurs.', 403, 'FORBIDDEN');
    }

    const notif = await Notification.findByPk(req.params.id_notif);
    if (!notif) return notFound(res, 'Notification');
    if (notif.id_user !== req.user.id_user) {
      throw new AppError('Acces refuse.', 403, 'FORBIDDEN');
    }
    if (!notif.source_notification_id) {
      throw new AppError("Cette notification n'est pas associee a une notification destinataire.", 409, 'NO_RECIPIENT_NOTIFICATION');
    }

    const sourceNotif = await Notification.findByPk(notif.source_notification_id);
    if (!sourceNotif) return notFound(res, 'Notification source');

    await sourceNotif.update({ lu: true });
    return ok(res, null, "Notification marquee comme lue pour l'utilisateur.");
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const notif = await Notification.findByPk(req.params.id_notif);
    if (!notif) return notFound(res, 'Notification');
    if (notif.id_user !== req.user.id_user) {
      throw new AppError('Acces refuse.', 403, 'FORBIDDEN');
    }
    await notif.destroy();
    return ok(res, null, 'Notification archivee.');
  } catch (err) { next(err); }
}

module.exports = { getMine, markAsRead, markAllAsRead, create, markRecipientAsRead, remove };
