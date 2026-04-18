'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole }    = require('../middlewares/rbac.middleware');
const { validate }     = require('../middlewares/validate.middleware');
const v = require('../validators/notification.validator');

router.use(authenticate);

// GET  /api/v1/notifications  (mes notifications)
router.get('/',          validate(v.query, 'query'), ctrl.getMine);

// PATCH /api/v1/notifications/:id_notif/lu
router.patch('/:id_notif/lu', validate(v.idParam, 'params'), ctrl.markAsRead);
router.patch('/:id_notif/lu-utilisateur', validate(v.markRecipientRead, 'params'), ctrl.markRecipientAsRead);

// PATCH /api/v1/notifications/lu-tout
router.patch('/lu-tout', ctrl.markAllAsRead);
router.delete('/:id_notif', validate(v.idParam, 'params'), ctrl.remove);

// POST /api/v1/notifications  (admin/secrétaire uniquement)
router.post('/', checkRole('administrateur', 'secretaire'), validate(v.create), ctrl.create);

module.exports = router;
