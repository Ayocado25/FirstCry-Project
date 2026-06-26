'use strict';
// auth.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { loginSchema, refreshTokenSchema, changePasswordSchema } = require('../validators/schemas');

router.post('/login',           validate(loginSchema),        ctrl.login);
router.post('/refresh',         validate(refreshTokenSchema), ctrl.refreshToken);
router.post('/logout',          ctrl.logout);
router.get('/me',               authenticate,                 ctrl.getMe);
router.put('/change-password',  authenticate, validate(changePasswordSchema), ctrl.changePassword);

module.exports = router;
