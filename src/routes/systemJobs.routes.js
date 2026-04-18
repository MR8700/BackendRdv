'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/systemJobController');
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole }    = require('../middlewares/rbac.middleware');

router.use(authenticate);
router.use(checkRole('administrateur'));

router.get('/',         ctrl.getAll);
router.get('/:id_job',  ctrl.getOne);
router.post('/run/:type_tache', ctrl.runManual);  // Déclencher un job manuellement
router.delete('/:id_job', ctrl.remove);

module.exports = router;