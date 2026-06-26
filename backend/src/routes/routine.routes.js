'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/routine.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middleware/validate.middleware');
const {
  createRoutineSchema, updateRoutineSchema, routineQuerySchema,
  mealLogSchema, updateMealLogSchema, napLogSchema,
  diaperLogSchema, activityLogSchema, moodLogSchema, uuidParam,
} = require('../validators/schemas');

const STAFF = ['admin', 'centre_head', 'teacher'];

router.use(authenticate);

// Daily routines
router.get('/',               validateQuery(routineQuerySchema),             ctrl.listRoutines);
router.post('/',              authorize(...STAFF), validate(createRoutineSchema), ctrl.createRoutine);
router.post('/bulk-summary',  authorize(...STAFF),                            ctrl.generateBulkSummaries);
router.get('/:id',            validateParams(uuidParam),                      ctrl.getRoutine);
router.put('/:id',            authorize(...STAFF), validateParams(uuidParam), validate(updateRoutineSchema), ctrl.updateRoutine);

// Meal logs
router.post('/meals',         authorize(...STAFF), validate(mealLogSchema),        ctrl.addMeal);
router.put('/meals/:id',      authorize(...STAFF), validate(updateMealLogSchema),   ctrl.updateMeal);
router.delete('/meals/:id',   authorize(...STAFF),                                  ctrl.deleteMeal);

// Nap logs
router.post('/naps',          authorize(...STAFF), validate(napLogSchema),  ctrl.addNap);
router.delete('/naps/:id',    authorize(...STAFF),                          ctrl.deleteNap);

// Diaper logs
router.post('/diapers',       authorize(...STAFF), validate(diaperLogSchema), ctrl.addDiaper);
router.delete('/diapers/:id', authorize(...STAFF),                            ctrl.deleteDiaper);

// Activity logs
router.post('/activities',        authorize(...STAFF), validate(activityLogSchema), ctrl.addActivity);
router.delete('/activities/:id',  authorize(...STAFF),                              ctrl.deleteActivity);

// Mood logs
router.post('/moods',             authorize(...STAFF), validate(moodLogSchema), ctrl.addMood);

module.exports = router;
