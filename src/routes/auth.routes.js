'use strict';

const router  = require('express').Router();
const ctrl    = require('../controllers/authController');
const { validate }    = require('../middlewares/validate.middleware');
const { authenticate }= require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const v               = require('../validators/auth.validator');

// POST /api/v1/auth/register
router.post('/register', authLimiter, validate(v.register), ctrl.register);

// POST /api/v1/auth/login
router.post('/login',   authLimiter, validate(v.login),   ctrl.login);

// POST /api/v1/auth/refresh
router.post('/refresh', authLimiter, validate(v.refresh), ctrl.refresh);

// POST /api/v1/auth/logout
router.post('/logout',  authenticate, ctrl.logout);

// GET  /api/v1/auth/me
router.get('/me',       authenticate, ctrl.me);

module.exports = router;