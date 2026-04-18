'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/serviceController');
const { authenticate }      = require('../middlewares/auth.middleware');
const { checkRole }         = require('../middlewares/rbac.middleware');
const { handleServiceUpload }= require('../middlewares/upload.middleware');
const { uploadLimiter }     = require('../middlewares/rateLimiter.middleware');

// GET /api/v1/services — public
router.get('/',    ctrl.getAll);
router.get('/:id_service', ctrl.getOne);

router.use(authenticate);

router.post('/',    checkRole('administrateur'), handleServiceUpload, ctrl.create);
router.put('/:id_service',  checkRole('administrateur'), ctrl.update);
router.put('/:id_service/image', checkRole('administrateur'), uploadLimiter, handleServiceUpload, ctrl.updateImage);
router.delete('/:id_service',    checkRole('administrateur'), ctrl.remove);

module.exports = router;