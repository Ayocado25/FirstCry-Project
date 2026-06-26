'use strict';

const Joi = require('joi');

// =============================================================
// Common reusable schemas
// =============================================================
const uuidParam = Joi.object({ id: Joi.string().uuid().required() });

const paginationQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

const dateRangeQuery = paginationQuery.append({
  date: Joi.date().iso(),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')),
  classroom_id: Joi.string().uuid(),
});

// =============================================================
// AUTH
// =============================================================
const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(6).required(),
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*[0-9])/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter and one number',
    }),
});

// =============================================================
// USERS
// =============================================================
const createUserSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(8).pattern(/^(?=.*[A-Z])(?=.*[0-9])/).required(),
  full_name: Joi.string().min(2).max(255).required().trim(),
  phone: Joi.string().pattern(/^\+?[\d\s-]{7,20}$/).allow(null, ''),
  role: Joi.string().valid('admin', 'centre_head', 'teacher', 'parent').required(),
});

const updateUserSchema = Joi.object({
  full_name: Joi.string().min(2).max(255).trim(),
  phone: Joi.string().pattern(/^\+?[\d\s-]{7,20}$/).allow(null, ''),
  is_active: Joi.boolean(),
});

// =============================================================
// CHILDREN
// =============================================================
const createChildSchema = Joi.object({
  full_name: Joi.string().min(2).max(255).required().trim(),
  date_of_birth: Joi.date().iso().max('now').required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  classroom_id: Joi.string().uuid().allow(null),
  primary_parent_id: Joi.string().uuid().allow(null),
  admission_status: Joi.string()
    .valid('enquiry', 'applied', 'enrolled', 'waitlisted', 'withdrawn')
    .default('enquiry'),
  admission_date: Joi.date().iso().allow(null),
  medical_notes: Joi.string().max(2000).allow(null, ''),
  dietary_restrictions: Joi.string().max(1000).allow(null, ''),
  blood_group: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').allow(null),
});

const updateChildSchema = createChildSchema.fork(
  ['full_name', 'date_of_birth', 'gender'],
  (s) => s.optional()
);

const childQuerySchema = paginationQuery.append({
  classroom_id: Joi.string().uuid(),
  admission_status: Joi.string().valid('enquiry', 'applied', 'enrolled', 'waitlisted', 'withdrawn'),
  search: Joi.string().max(100).trim(),
  is_active: Joi.boolean(),
});

// =============================================================
// DAILY ROUTINES
// =============================================================
const createRoutineSchema = Joi.object({
  child_id: Joi.string().uuid().required(),
  date: Joi.date().iso().required(),
  overall_mood: Joi.string().valid('happy', 'calm', 'fussy', 'tired', 'upset', 'excited').allow(null),
  general_notes: Joi.string().max(2000).allow(null, ''),
});

const updateRoutineSchema = Joi.object({
  overall_mood: Joi.string().valid('happy', 'calm', 'fussy', 'tired', 'upset', 'excited').allow(null),
  general_notes: Joi.string().max(2000).allow(null, ''),
  is_complete: Joi.boolean(),
});

const routineQuerySchema = dateRangeQuery.append({
  child_id: Joi.string().uuid(),
  is_complete: Joi.boolean(),
});

// =============================================================
// MEAL LOGS
// =============================================================
const mealLogSchema = Joi.object({
  routine_id: Joi.string().uuid().required(),
  meal_type: Joi.string()
    .valid('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner')
    .required(),
  food_items: Joi.string().max(500).allow(null, ''),
  amount_eaten: Joi.string().valid('none', 'little', 'half', 'most', 'all').default('half'),
  time_served: Joi.date().iso().allow(null),
  notes: Joi.string().max(500).allow(null, ''),
});

const updateMealLogSchema = mealLogSchema.fork(
  ['routine_id', 'meal_type'],
  (s) => s.optional()
);

// =============================================================
// NAP LOGS
// =============================================================
const napLogSchema = Joi.object({
  routine_id: Joi.string().uuid().required(),
  start_time: Joi.date().iso().allow(null),
  end_time: Joi.date().iso().greater(Joi.ref('start_time')).allow(null),
  sleep_quality: Joi.string().valid('good', 'restless', 'short', 'long').allow(null),
  notes: Joi.string().max(500).allow(null, ''),
});

// =============================================================
// DIAPER LOGS
// =============================================================
const diaperLogSchema = Joi.object({
  routine_id: Joi.string().uuid().required(),
  change_time: Joi.date().iso().required(),
  diaper_type: Joi.string().valid('wet', 'soiled', 'dry', 'not_checked').default('wet'),
  notes: Joi.string().max(500).allow(null, ''),
});

// =============================================================
// ACTIVITY LOGS
// =============================================================
const activityLogSchema = Joi.object({
  routine_id: Joi.string().uuid().required(),
  activity_type: Joi.string()
    .valid('play', 'outdoor', 'art', 'music', 'reading', 'learning', 'other')
    .required(),
  activity_name: Joi.string().max(255).allow(null, ''),
  start_time: Joi.date().iso().allow(null),
  end_time: Joi.date().iso().allow(null),
  description: Joi.string().max(1000).allow(null, ''),
  notes: Joi.string().max(500).allow(null, ''),
});

// =============================================================
// MOOD LOGS
// =============================================================
const moodLogSchema = Joi.object({
  routine_id: Joi.string().uuid().required(),
  mood: Joi.string().valid('happy', 'calm', 'fussy', 'tired', 'upset', 'excited').required(),
  notes: Joi.string().max(500).allow(null, ''),
});

// =============================================================
// STAFF ATTENDANCE
// =============================================================
const staffAttendanceSchema = Joi.object({
  staff_id: Joi.string().uuid().required(),
  date: Joi.date().iso().required(),
  status: Joi.string().valid('present', 'absent', 'half_day', 'late').required(),
  shift: Joi.string().valid('morning', 'afternoon', 'full_day', 'split').allow(null),
  clock_in: Joi.date().iso().allow(null),
  clock_out: Joi.date().iso().greater(Joi.ref('clock_in')).allow(null),
  notes: Joi.string().max(500).allow(null, ''),
});

const clockInSchema = Joi.object({
  staff_id: Joi.string().uuid().required(),
  shift: Joi.string().valid('morning', 'afternoon', 'full_day', 'split').default('full_day'),
});

const clockOutSchema = Joi.object({
  staff_id: Joi.string().uuid().required(),
});

const attendanceQuerySchema = paginationQuery.append({
  date: Joi.date().iso(),
  week_start: Joi.date().iso(),
  status: Joi.string().valid('present', 'absent', 'half_day', 'late'),
  staff_id: Joi.string().uuid(),
});

// =============================================================
// DUTY ROSTER
// =============================================================
const rosterSchema = Joi.object({
  staff_id: Joi.string().uuid().required(),
  classroom_id: Joi.string().uuid().required(),
  date: Joi.date().iso().required(),
  shift: Joi.string().valid('morning', 'afternoon', 'full_day', 'split').required(),
  start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).allow(null),
  end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).allow(null),
  is_lead: Joi.boolean().default(false),
  notes: Joi.string().max(500).allow(null, ''),
});

const rosterQuerySchema = Joi.object({
  week_start: Joi.date().iso(),
  classroom_id: Joi.string().uuid(),
  staff_id: Joi.string().uuid(),
});

// =============================================================
// TEACHER TASKS
// =============================================================
const createTaskSchema = Joi.object({
  title: Joi.string().min(3).max(255).required().trim(),
  description: Joi.string().max(2000).allow(null, ''),
  assigned_to: Joi.string().uuid().required(),
  classroom_id: Joi.string().uuid().allow(null),
  due_date: Joi.date().iso().allow(null),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  category: Joi.string().max(100).allow(null, ''),
});

const updateTaskSchema = createTaskSchema.fork(
  ['title', 'assigned_to'],
  (s) => s.optional()
).append({
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled'),
  notes: Joi.string().max(1000).allow(null, ''),
});

const taskStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').required(),
  notes: Joi.string().max(1000).allow(null, ''),
});

const taskQuerySchema = paginationQuery.append({
  assigned_to: Joi.string().uuid(),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  classroom_id: Joi.string().uuid(),
  due_date: Joi.date().iso(),
  overdue: Joi.boolean(),
});

// =============================================================
// NOTIFICATIONS
// =============================================================
const sendDailySummarySchema = Joi.object({
  date: Joi.date().iso().default(() => new Date()),
  classroom_id: Joi.string().uuid().allow(null),
  child_ids: Joi.array().items(Joi.string().uuid()).allow(null),
  channels: Joi.array()
    .items(Joi.string().valid('email', 'whatsapp'))
    .default(['email']),
});

// =============================================================
// PARENTS
// =============================================================
const createParentSchema = Joi.object({
  full_name: Joi.string().min(2).max(255).required().trim(),
  relationship: Joi.string().max(50).allow(null, ''),
  phone: Joi.string().pattern(/^\+?[\d\s-]{7,20}$/).allow(null, ''),
  email: Joi.string().email().lowercase().allow(null, ''),
  whatsapp_number: Joi.string().max(20).allow(null, ''),
  address: Joi.string().max(1000).allow(null, ''),
  emergency_contact_name: Joi.string().max(255).allow(null, ''),
  emergency_contact_phone: Joi.string().max(20).allow(null, ''),
});

module.exports = {
  uuidParam,
  paginationQuery,
  dateRangeQuery,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
  createChildSchema,
  updateChildSchema,
  childQuerySchema,
  createRoutineSchema,
  updateRoutineSchema,
  routineQuerySchema,
  mealLogSchema,
  updateMealLogSchema,
  napLogSchema,
  diaperLogSchema,
  activityLogSchema,
  moodLogSchema,
  staffAttendanceSchema,
  clockInSchema,
  clockOutSchema,
  attendanceQuerySchema,
  rosterSchema,
  rosterQuerySchema,
  createTaskSchema,
  updateTaskSchema,
  taskStatusSchema,
  taskQuerySchema,
  sendDailySummarySchema,
  createParentSchema,
};
