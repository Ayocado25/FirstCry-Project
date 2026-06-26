'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/children.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middleware/validate.middleware');
const { audit } = require('../middleware/audit.middleware');
const {
  createChildSchema, updateChildSchema, childQuerySchema, uuidParam,
} = require('../validators/schemas');

const STAFF = ['admin', 'centre_head', 'teacher'];
const ADMIN = ['admin', 'centre_head'];

router.use(authenticate);

router.get('/',         validateQuery(childQuerySchema),               ctrl.listChildren);
router.post('/',        authorize(...STAFF), validate(createChildSchema), audit('CREATE_CHILD', 'children'), ctrl.createChild);
router.get('/:id',      validateParams(uuidParam),                     ctrl.getChild);
router.put('/:id',      authorize(...STAFF), validateParams(uuidParam), validate(updateChildSchema), ctrl.updateChild);
router.delete('/:id',   authorize(...ADMIN), validateParams(uuidParam), ctrl.deleteChild);

router.get('/:id/routines', validateParams(uuidParam), ctrl.getChildRoutines);

router.post('/:id/allergies',               authorize(...STAFF), ctrl.addAllergy);
router.delete('/:id/allergies/:allergyId',  authorize(...STAFF), ctrl.removeAllergy);

module.exports = router;
