'use strict';
const router = require('express').Router();
const { listParents, getParent, createParent, updateParent } = require('../controllers/classroom_parent.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createParentSchema } = require('../validators/schemas');

const STAFF = ['admin','centre_head','teacher'];

router.use(authenticate);
router.get('/',     listParents);
router.post('/',    authorize(...STAFF), validate(createParentSchema), createParent);
router.get('/:id',  getParent);
router.put('/:id',  authorize(...STAFF), updateParent);

module.exports = router;
