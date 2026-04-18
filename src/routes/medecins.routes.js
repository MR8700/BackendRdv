'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/medecinController');
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/rbac.middleware');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id_user', ctrl.getOne);
router.get('/:id_user/disponibilites', ctrl.getDisponibilites);
router.get('/:id_user/plannings', ctrl.getPlannings);
router.get('/:id_user/delegations', checkRole('medecin', 'administrateur'), ctrl.getDelegations);
router.put('/:id_user/delegations/:id_secretaire', checkRole('medecin', 'administrateur'), ctrl.updateDelegation);
router.put('/:id_user', checkRole('medecin', 'administrateur'), ctrl.update);

module.exports = router;
