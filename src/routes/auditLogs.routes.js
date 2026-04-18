'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/auditLogController');
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole }    = require('../middlewares/rbac.middleware');

router.use(authenticate);
router.use(checkRole('administrateur'));

router.get('/',                ctrl.getAll);
router.get('/user/:id_user',   ctrl.getByUser);

module.exports = router;