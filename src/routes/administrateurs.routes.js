'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/administrateurController');
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole, checkPermission } = require('../middlewares/rbac.middleware');

router.use(authenticate);
router.use(checkRole('administrateur'));

router.get('/permissions/matrix', checkPermission('attribuer_permissions'), ctrl.getPermissionMatrix);
router.put(
  '/permissions/:id_role',
  checkPermission('attribuer_permissions'),
  ctrl.updateRolePermissions
);
router.post(
  '/impersonation/request',
  checkPermission('demander_navigation_compte'),
  ctrl.requestAccountAccess
);
router.post('/impersonation/force', ctrl.forceAccountAccess);
router.get('/', ctrl.getAll);
router.get('/:id_user', ctrl.getOne);
router.put('/:id_user', ctrl.update);

module.exports = router;
