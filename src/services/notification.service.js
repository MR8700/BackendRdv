const { AuditLog } = require('../models');
const { auditManual } = require('../middlewares/audit.middleware');

class NotificationService {
  /**
   * Journalise un événement de notification pour un rendez-vous
   * @param {Object} req - Requête Express
   * @param {string} eventType - Type d'événement (CREATION_RDV, CONFIRMATION_RDV, ANNULATION_RDV, RAPPEL_RDV)
   * @param {number} rdvId - ID du rendez-vous
   * @param {Object} details - Détails supplémentaires
   */
  async logNotificationEvent(req, eventType, rdvId, details = {}) {
    try {
      const auditData = {
        id_rdv: rdvId,
        type_evenement: eventType,
        details: JSON.stringify(details),
        timestamp: new Date(),
      };

      // Utiliser le middleware d'audit pour journaliser
      await auditManual(req, eventType, 'notification_rdv', auditData);

      console.log(`Notification logged: ${eventType} for RDV ${rdvId}`);
    } catch (error) {
      console.error('Erreur lors de la journalisation de notification:', error);
      // Ne pas throw pour éviter de casser le flux principal
    }
  }

  /**
   * Journalise la création d'un rendez-vous
   */
  async logRdvCreation(req, rdvId, patientInfo, medecinInfo) {
    await this.logNotificationEvent(req, 'CREATION_RDV', rdvId, {
      patient: patientInfo,
      medecin: medecinInfo,
      action: 'Rendez-vous créé et en attente de confirmation',
    });
  }

  /**
   * Journalise la confirmation d'un rendez-vous
   */
  async logRdvConfirmation(req, rdvId, patientInfo, medecinInfo) {
    await this.logNotificationEvent(req, 'CONFIRMATION_RDV', rdvId, {
      patient: patientInfo,
      medecin: medecinInfo,
      action: 'Rendez-vous confirmé par le médecin',
    });
  }

  /**
   * Journalise l'annulation d'un rendez-vous
   */
  async logRdvCancellation(req, rdvId, cancelledBy, reason = null) {
    await this.logNotificationEvent(req, 'ANNULATION_RDV', rdvId, {
      annule_par: cancelledBy,
      raison: reason,
      action: 'Rendez-vous annulé',
    });
  }

  /**
   * Journalise l'envoi d'un rappel de rendez-vous
   */
  async logRdvReminder(req, rdvId, patientInfo, hoursBefore) {
    await this.logNotificationEvent(req, 'RAPPEL_RDV', rdvId, {
      patient: patientInfo,
      heures_avant: hoursBefore,
      action: `Rappel envoyé ${hoursBefore}h avant le rendez-vous`,
    });
  }

  /**
   * Journalise une notification d'urgence ou d'information
   */
  async logUrgentNotification(req, rdvId, message, priority = 'normal') {
    await this.logNotificationEvent(req, 'NOTIFICATION_URGENTE', rdvId, {
      message,
      priorite: priority,
      action: 'Notification urgente envoyée',
    });
  }
}

module.exports = new NotificationService();