'use strict';

const nodemailer = require('nodemailer');
const { MailtrapTransport } = require('mailtrap');
const { mail, NODE_ENV } = require('./env');

const emailEnabled = Boolean(mail.enabled && mail.token);

const transporter = emailEnabled
  ? nodemailer.createTransport(MailtrapTransport({ token: mail.token }))
  : null;

const sender = {
  address: mail.fromAddress,
  name: mail.fromName,
};

async function verifyMailer() {
  if (NODE_ENV === 'test') return;

  if (!emailEnabled) {
    console.info('[MAIL] Canal email desactive. Les notifications internes restent actives.');
    return;
  }

  try {
    await transporter.verify();
    console.log(`[MAIL] Mailtrap connecte (token: ...${mail.token.slice(-6)})`);
  } catch (err) {
    console.warn(`[MAIL] Mailtrap indisponible : ${err.message}`);
  }
}

const templates = {
  rappelRdv: ({ nomPatient, nomMedecin, dateRdv, heureRdv, nomService }) => ({
    subject: `Rappel de votre rendez-vous - ${dateRdv} a ${heureRdv}`,
    html: `
      <h2>Rappel de rendez-vous</h2>
      <p>Bonjour <strong>${nomPatient}</strong>,</p>
      <p>Votre rendez-vous avec <strong>Dr ${nomMedecin}</strong>
         (${nomService}) est prevu le <strong>${dateRdv}</strong>
         a <strong>${heureRdv}</strong>.</p>
      <p>En cas d'empêchement, merci d'annuler au moins 24h a l'avance.</p>
      <hr/><small>Message automatique - ne pas repondre.</small>
    `,
    category: 'rappel',
  }),

  urgence: ({ nomDestinataire, message }) => ({
    subject: 'Alerte urgente - Clinique',
    html: `
      <h2 style="color:#c0392b;">Alerte urgente</h2>
      <p>Bonjour <strong>${nomDestinataire}</strong>,</p>
      <p>${message}</p>
      <hr/><small>Message automatique - ne pas repondre.</small>
    `,
    category: 'urgence',
  }),

  information: ({ nomDestinataire, titre, message }) => ({
    subject: `Information : ${titre}`,
    html: `
      <h2>${titre}</h2>
      <p>Bonjour <strong>${nomDestinataire}</strong>,</p>
      <p>${message}</p>
      <hr/><small>Message automatique - ne pas repondre.</small>
    `,
    category: 'information',
  }),
};

async function sendMail(to, templateKey, data = {}) {
  const template = templates[templateKey];
  if (!template) {
    throw new Error(
      `[MAIL] Template inconnu : "${templateKey}". Disponibles : ${Object.keys(templates).join(', ')}`
    );
  }

  if (!to) {
    return { skipped: true, reason: 'missing_recipient' };
  }

  if (!emailEnabled) {
    return { skipped: true, reason: 'mail_disabled' };
  }

  const { subject, html, category } = template(data);

  const info = await transporter.sendMail({
    from: sender,
    to,
    subject,
    html,
    category,
  });

  if (NODE_ENV === 'development') {
    console.log(`[MAIL] Envoye a ${to} | "${subject}" | ID: ${info.messageId}`);
  }

  return info;
}

module.exports = {
  transporter,
  sender,
  verifyMailer,
  sendMail,
  templates,
  isEmailEnabled: () => emailEnabled,
};
