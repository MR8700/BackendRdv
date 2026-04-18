'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/cliniqueController');
const { authenticate }    = require('../middlewares/auth.middleware');
const { checkRole }       = require('../middlewares/rbac.middleware');
const { handleLogoUpload }= require('../middlewares/upload.middleware');
const { uploadLimiter }   = require('../middlewares/rateLimiter.middleware');

// GET /api/v1/clinique  — public
router.get('/', ctrl.get);

router.use(authenticate);

// PUT /api/v1/clinique
router.put('/', checkRole('administrateur'), ctrl.update);

// PUT /api/v1/clinique/logo
router.put('/logo', checkRole('administrateur'), uploadLimiter, handleLogoUpload, ctrl.updateLogo);

module.exports = router;