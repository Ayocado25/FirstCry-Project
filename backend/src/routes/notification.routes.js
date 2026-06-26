'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/notification.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, validateQuery } = require('../middleware/validate.middleware');
const { sendDailySummarySchema } = require('../validators/schemas');

router.use(authenticate);
router.post('/send-daily',  authorize('admin','centre_head'), validate(sendDailySummarySchema), ctrl.sendDailySummaries);
router.get('/history',      ctrl.getNotificationHistory);

module.exports = router;
