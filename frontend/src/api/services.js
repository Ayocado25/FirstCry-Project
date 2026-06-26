import api from './client';

// ── AUTH ────────────────────────────────────────────────────
export const authApi = {
  login:          (data)       => api.post('/auth/login', data),
  refresh:        (token)      => api.post('/auth/refresh', { refresh_token: token }),
  logout:         (token)      => api.post('/auth/logout', { refresh_token: token }),
  me:             ()           => api.get('/auth/me'),
  changePassword: (data)       => api.put('/auth/change-password', data),
};

// ── CHILDREN ─────────────────────────────────────────────────
export const childrenApi = {
  list:          (params)            => api.get('/children', { params }),
  get:           (id)                => api.get(`/children/${id}`),
  create:        (data)              => api.post('/children', data),
  update:        (id, data)          => api.put(`/children/${id}`, data),
  delete:        (id)                => api.delete(`/children/${id}`),
  getRoutines:   (id, params)        => api.get(`/children/${id}/routines`, { params }),
  addAllergy:    (id, data)          => api.post(`/children/${id}/allergies`, data),
  removeAllergy: (id, allergyId)     => api.delete(`/children/${id}/allergies/${allergyId}`),
};

// ── ROUTINES ─────────────────────────────────────────────────
export const routineApi = {
  list:         (params)  => api.get('/routines', { params }),
  get:          (id)      => api.get(`/routines/${id}`),
  create:       (data)    => api.post('/routines', data),
  update:       (id, data)=> api.put(`/routines/${id}`, data),
  bulkSummary:  (data)    => api.post('/routines/bulk-summary', data),

  addMeal:      (data)    => api.post('/routines/meals', data),
  updateMeal:   (id, data)=> api.put(`/routines/meals/${id}`, data),
  deleteMeal:   (id)      => api.delete(`/routines/meals/${id}`),

  addNap:       (data)    => api.post('/routines/naps', data),
  deleteNap:    (id)      => api.delete(`/routines/naps/${id}`),

  addDiaper:    (data)    => api.post('/routines/diapers', data),
  deleteDiaper: (id)      => api.delete(`/routines/diapers/${id}`),

  addActivity:  (data)    => api.post('/routines/activities', data),
  deleteActivity:(id)     => api.delete(`/routines/activities/${id}`),

  addMood:      (data)    => api.post('/routines/moods', data),
};

// ── STAFF ────────────────────────────────────────────────────
export const staffApi = {
  list:             (params)      => api.get('/staff', { params }),
  get:              (id)          => api.get(`/staff/${id}`),
  listAttendance:   (params)      => api.get('/staff/attendance', { params }),
  logAttendance:    (data)        => api.post('/staff/attendance', data),
  updateAttendance: (id, data)    => api.put(`/staff/attendance/${id}`, data),
  clockIn:          (data)        => api.post('/staff/attendance/clock-in', data),
  clockOut:         (data)        => api.post('/staff/attendance/clock-out', data),
};

// ── ROSTER ───────────────────────────────────────────────────
export const rosterApi = {
  get:    (params)      => api.get('/roster', { params }),
  create: (data)        => api.post('/roster', data),
  delete: (id)          => api.delete(`/roster/${id}`),
};

// ── TASKS ────────────────────────────────────────────────────
export const taskApi = {
  list:         (params)      => api.get('/tasks', { params }),
  get:          (id)          => api.get(`/tasks/${id}`),
  create:       (data)        => api.post('/tasks', data),
  update:       (id, data)    => api.put(`/tasks/${id}`, data),
  updateStatus: (id, data)    => api.put(`/tasks/${id}/status`, data),
  delete:       (id)          => api.delete(`/tasks/${id}`),
  addComment:   (id, data)    => api.post(`/tasks/${id}/comments`, data),
};

// ── DASHBOARD ────────────────────────────────────────────────
export const dashboardApi = {
  kpis:       ()          => api.get('/dashboard/kpis'),
  classroom:  (id)        => api.get(`/dashboard/classroom/${id}`),
  attendance: (params)    => api.get('/dashboard/attendance', { params }),
  routines:   (params)    => api.get('/dashboard/routines', { params }),
};

// ── NOTIFICATIONS ────────────────────────────────────────────
export const notificationApi = {
  sendDaily:  (data)      => api.post('/notifications/send-daily', data),
  history:    (params)    => api.get('/notifications/history', { params }),
};

// ── CLASSROOMS ───────────────────────────────────────────────
export const classroomApi = {
  list:   ()              => api.get('/classrooms'),
  get:    (id)            => api.get(`/classrooms/${id}`),
  create: (data)          => api.post('/classrooms', data),
  update: (id, data)      => api.put(`/classrooms/${id}`, data),
};

// ── PARENTS ──────────────────────────────────────────────────
export const parentApi = {
  list:   (params)        => api.get('/parents', { params }),
  get:    (id)            => api.get(`/parents/${id}`),
  create: (data)          => api.post('/parents', data),
  update: (id, data)      => api.put(`/parents/${id}`, data),
};
