'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/disponibiliteController');
const { authenticate }         = require('../middlewares/auth.middleware');
const { checkRole }            = require('../middlewares/rbac.middleware');
const { validate }             = require('../middlewares/validate.middleware');
const { authenticateOptional } = require('../middlewares/auth.middleware');
const v = require('../validators/planning.validator');

// GET /api/v1/disponibilites  — accessible sans compte (prise de RDV publique)
router.get('/',             authenticateOptional, ctrl.getAll);
router.get('/:id_dispo',    authenticateOptional, ctrl.getOne);

router.use(authenticate);

router.post('/',            checkRole('medecin', 'secretaire', 'administrateur'), validate(v.createDispo), ctrl.create);
router.put('/:id_dispo',    checkRole('medecin', 'secretaire', 'administrateur'), ctrl.update);
router.delete('/:id_dispo', checkRole('medecin', 'secretaire', 'administrateur'), ctrl.remove);

module.exports = router;
