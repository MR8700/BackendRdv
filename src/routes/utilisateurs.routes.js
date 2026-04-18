'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/utilisateurController');
const { authenticate }  = require('../middlewares/auth.middleware');
const { checkRole, isSelf } = require('../middlewares/rbac.middleware');
const { validate, validateMany } = require('../middlewares/validate.middleware');
const { handlePhotoUpload }      = require('../middlewares/upload.middleware');
const { uploadLimiter }          = require('../middlewares/rateLimiter.middleware');
const { auditAfter }             = require('../middlewares/audit.middleware');
const v = require('../validators/utilisateur.validator');

router.use(authenticate);

// GET    /api/v1/utilisateurs
router.get('/',     checkRole('administrateur'), ctrl.getAll);

// POST   /api/v1/utilisateurs
router.post('/',    checkRole('administrateur'), validate(v.create), auditAfter('utilisateurs'), ctrl.create);

// GET    /api/v1/utilisateurs/:id_user
router.get('/:id_user',    isSelf('id_user'), ctrl.getOne);

// PUT    /api/v1/utilisateurs/:id_user
router.put('/:id_user',    isSelf('id_user'), validateMany({ params: v.idParam, body: v.update }), auditAfter('utilisateurs'), ctrl.update);

// DELETE /api/v1/utilisateurs/:id_user  (archivage logique)
router.delete('/:id_user', checkRole('administrateur'), validate(v.idParam, 'params'), auditAfter('utilisateurs'), ctrl.archive);

// PATCH  /api/v1/utilisateurs/:id_user/password
router.patch('/:id_user/password', isSelf('id_user'), validateMany({ params: v.idParam, body: v.changePassword }), ctrl.changePassword);

// PUT    /api/v1/utilisateurs/:id_user/photo
router.put('/:id_user/photo', isSelf('id_user'), uploadLimiter, handlePhotoUpload, ctrl.updatePhoto);

module.exports = router;