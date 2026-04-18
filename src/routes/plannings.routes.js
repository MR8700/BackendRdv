'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/planningController');
const { authenticate } = require('../middlewares/auth.middleware');
const { checkRole }    = require('../middlewares/rbac.middleware');
const { validate }     = require('../middlewares/validate.middleware');
const v = require('../validators/planning.validator');

router.use(authenticate);

router.get('/',              ctrl.getAll);
router.get('/:id_planning',  ctrl.getOne);
router.post('/',             checkRole('administrateur', 'secretaire'), validate(v.create), ctrl.create);
router.delete('/:id_planning', checkRole('administrateur'), ctrl.remove);

module.exports = router;