'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/staff.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middleware/validate.middleware');
const {
  staffAttendanceSchema, clockInSchema, clockOutSchema,
  attendanceQuerySchema, uuidParam,
} = require('../validators/schemas');

const ADMIN = ['admin', 'centre_head'];
const STAFF = ['admin', 'centre_head', 'teacher'];

router.use(authenticate);

// Staff list
router.get('/',     ctrl.listStaff);
router.get('/:id',  validateParams(uuidParam), ctrl.getStaffMember);

// Attendance
router.get('/attendance',         validateQuery(attendanceQuerySchema), ctrl.listAttendance);
router.post('/attendance',        authorize(...ADMIN), validate(staffAttendanceSchema), ctrl.logAttendance);
router.put('/attendance/:id',     authorize(...ADMIN), ctrl.updateAttendance);
router.post('/attendance/clock-in',  authorize(...STAFF), validate(clockInSchema),  ctrl.clockIn);
router.post('/attendance/clock-out', authorize(...STAFF), validate(clockOutSchema), ctrl.clockOut);

module.exports = router;
