'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/staff.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, validateQuery } = require('../middleware/validate.middleware');
const { rosterSchema, rosterQuerySchema } = require('../validators/schemas');

router.use(authenticate);
router.get('/',       validateQuery(rosterQuerySchema),                          ctrl.getRoster);
router.post('/',      authorize('admin','centre_head'), validate(rosterSchema),  ctrl.createRosterAssignment);
router.delete('/:id', authorize('admin','centre_head'),                          ctrl.deleteRosterAssignment);

module.exports = router;
