'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/secretaireController');
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole }    = require('../middlewares/rbac.middleware');

router.use(authenticate);

router.get('/',         checkRole('administrateur'), ctrl.getAll);
router.get('/:id_user', checkRole('administrateur', 'secretaire'), ctrl.getOne);
router.put('/:id_user', checkRole('administrateur'), ctrl.update);

module.exports = router;