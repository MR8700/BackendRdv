'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/patientController');
const { authenticate }       = require('../middlewares/auth.middleware');
const { checkRole, isSelf }  = require('../middlewares/rbac.middleware');
const { auditAfter }         = require('../middlewares/audit.middleware');

router.use(authenticate);

// GET /api/v1/patients
router.get('/',          checkRole('medecin', 'secretaire', 'administrateur'), ctrl.getAll);

// GET /api/v1/patients/:id_user
router.get('/:id_user',  checkRole('medecin', 'secretaire', 'administrateur'), ctrl.getOne);

// GET /api/v1/patients/:id_user/rendez-vous
router.get('/:id_user/rendez-vous', checkRole('patient', 'medecin', 'secretaire', 'administrateur'), ctrl.getRendezVous);

// PUT /api/v1/patients/:id_user
router.put('/:id_user',  isSelf('id_user'), auditAfter('patients'), ctrl.update);

module.exports = router;
