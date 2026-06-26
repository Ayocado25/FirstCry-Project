'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/task.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middleware/validate.middleware');
const { createTaskSchema, updateTaskSchema, taskStatusSchema, taskQuerySchema, uuidParam } = require('../validators/schemas');

const STAFF = ['admin','centre_head','teacher'];
const ADMIN = ['admin','centre_head'];

router.use(authenticate);
router.get('/',           validateQuery(taskQuerySchema),                      ctrl.listTasks);
router.post('/',          authorize(...ADMIN), validate(createTaskSchema),     ctrl.createTask);
router.get('/:id',        validateParams(uuidParam),                           ctrl.getTask);
router.put('/:id',        authorize(...ADMIN), validate(updateTaskSchema),     ctrl.updateTask);
router.put('/:id/status', authorize(...STAFF), validate(taskStatusSchema),     ctrl.updateTaskStatus);
router.delete('/:id',     authorize(...ADMIN),                                 ctrl.deleteTask);
router.post('/:id/comments', authorize(...STAFF),                              ctrl.addComment);

module.exports = router;
