'use strict';

const { sendMail, isEmailEnabled } = require('../config/mailer');
const { Notification, Utilisateur } = require('../models');
const { TYPE_NOTIFICATION, TYPE_USER } = require('../utils/constants.util');

async function persistNotification({
  id_user,
  id_rdv = null,
  type_notification,
  message,
  source_notification_id = null,
  recipient_user_id = null,
  created_by_user_id = null,
}) {
  return Notification.create({
    id_user,
    id_rdv,
    type_notification,
    message,
    source_notification_id,
    recipient_user_id: recipient_user_id ?? id_user,
    created_by_user_id,
    lu: false,
  });
}

async function mirrorNotificationToAdmins(sourceNotification, excludedAdminIds = []) {
  const admins = await Utilisateur.findAll({
    attributes: ['id_user'],
    where: { type_user: TYPE_USER.ADMINISTRATEUR },
  });

  const recipientUserId = sourceNotification.recipient_user_id ?? sourceNotification.id_user;
  const adminIds = admins
    .map((admin) => admin.id_user)
    .filter((adminId) => !excludedAdminIds.includes(adminId));

  if (adminIds.length === 0) return [];

  return Promise.all(
    adminIds.map((adminId) =>
      persistNotification({
        id_user: adminId,
        id_rdv: sourceNotification.id_rdv,
        type_notification: sourceNotification.type_notification,
        message: sourceNotification.message,
        source_notification_id: sourceNotification.id_notif,
        recipient_user_id: recipientUserId,
        created_by_user_id: sourceNotification.created_by_user_id,
      })
    )
  );
}

async function createInternalNotification({
  id_user,
  id_rdv = null,
  type_notification,
  message,
  created_by_user_id = null,
}) {
  const notification = await persistNotification({
    id_user,
    id_rdv,
    type_notification,
    message,
    created_by_user_id,
  });

  await mirrorNotificationToAdmins(notification, [id_user]);
  return notification;
}

async function notifyUsersAndAdmins({
  userIds,
  id_rdv = null,
  type_notification,
  message,
  created_by_user_id = null,
}) {
  const uniqueUserIds = [
    ...new Set(
      (userIds || [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    ),
  ];

  if (uniqueUserIds.length === 0) return [];

  return Promise.all(
    uniqueUserIds.map((id_user) =>
      createInternalNotification({
        id_user,
        id_rdv,
        type_notification,
        message,
        created_by_user_id,
      })
    )
  );
}

async function trySendMail(emailDestinataire, templateKey, data) {
  try {
    return await sendMail(emailDestinataire, templateKey, data);
  } catch (error) {
    console.warn(`[MAIL] Envoi ignore pour ${templateKey}: ${error.message}`);
    return { skipped: true, reason: 'send_failed' };
  }
}

async function envoyerRappelRdv({ id_user, id_rdv, emailDestinataire, data }) {
  const notification = await createInternalNotification({
    id_user,
    id_rdv,
    type_notification: TYPE_NOTIFICATION.RAPPEL,
    message: `Rappel RDV du ${data.dateRdv} a ${data.heureRdv} avec Dr ${data.nomMedecin}.`,
  });

  const delivery = await trySendMail(emailDestinataire, 'rappelRdv', data);
  return { notification, delivery, emailEnabled: isEmailEnabled() };
}

async function envoyerUrgence({ id_user, emailDestinataire, data }) {
  const notification = await createInternalNotification({
    id_user,
    type_notification: TYPE_NOTIFICATION.URGENCE,
    message: data.message,
  });

  const delivery = await trySendMail(emailDestinataire, 'urgence', data);
  return { notification, delivery, emailEnabled: isEmailEnabled() };
}

async function envoyerInformation({ id_user, id_rdv = null, emailDestinataire, data }) {
  const notification = await createInternalNotification({
    id_user,
    id_rdv,
    type_notification: TYPE_NOTIFICATION.INFORMATION,
    message: data.message,
    created_by_user_id: data.created_by_user_id ?? null,
  });

  const delivery = await trySendMail(emailDestinataire, 'information', data);
  return { notification, delivery, emailEnabled: isEmailEnabled() };
}

module.exports = {
  envoyerRappelRdv,
  envoyerUrgence,
  envoyerInformation,
  createInternalNotification,
  notifyUsersAndAdmins,
};
