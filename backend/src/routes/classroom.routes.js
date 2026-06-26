'use strict';
const router = require('express').Router();
const { listClassrooms, getClassroom, createClassroom, updateClassroom } = require('../controllers/classroom_parent.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/',     listClassrooms);
router.post('/',    authorize('admin','centre_head'), createClassroom);
router.get('/:id',  getClassroom);
router.put('/:id',  authorize('admin','centre_head'), updateClassroom);

module.exports = router;
