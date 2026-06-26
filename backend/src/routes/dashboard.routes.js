'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/kpis',              authorize('admin','centre_head'), ctrl.getKPIs);
router.get('/classroom/:id',     ctrl.getClassroomStats);
router.get('/attendance',        ctrl.getAttendanceSummary);
router.get('/routines',          ctrl.getRoutineCompletionStats);

module.exports = router;
