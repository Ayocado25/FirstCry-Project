'use strict';

const { query, withTransaction } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const { success, paginate, getOffset, getWeekStart, getWeekDates, formatDate } = require('../utils/response');

// ---------------------------------------------------------------
// STAFF CRUD
// ---------------------------------------------------------------

async function listStaff(req, res, next) {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    const offset = getOffset(page, limit);

    const conditions = ['s.deleted_at IS NULL', 'u.deleted_at IS NULL'];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.full_name ILIKE $${idx} OR s.designation ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (typeof is_active === 'boolean') {
      conditions.push(`s.is_active = $${idx++}`);
      params.push(is_active);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [data, count] = await Promise.all([
      query(
        `SELECT s.id, s.employee_id, s.designation, s.department, s.date_of_joining, s.is_active,
                u.id AS user_id, u.full_name, u.email, u.phone, u.profile_photo,
                cl.name AS classroom_name
         FROM staff s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN classrooms cl ON cl.lead_teacher_id = u.id AND cl.deleted_at IS NULL
         ${where}
         ORDER BY u.full_name ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM staff s JOIN users u ON u.id = s.user_id ${where}`, params),
    ]);

    return success(res, paginate(data.rows, parseInt(count.rows[0].count), page, limit));
  } catch (err) { next(err); }
}

async function getStaffMember(req, res, next) {
  try {
    const result = await query(
      `SELECT s.*, u.full_name, u.email, u.phone, u.profile_photo, u.role
       FROM staff s JOIN users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Staff member not found.');
    return success(res, result.rows[0]);
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------
// STAFF ATTENDANCE
// ---------------------------------------------------------------

async function listAttendance(req, res, next) {
  try {
    const { page = 1, limit = 50, date, week_start, status, staff_id } = req.query;
    const offset = getOffset(page, limit);

    const conditions = ['s.deleted_at IS NULL'];
    const params = [];
    let idx = 1;

    if (date) { conditions.push(`sa.date = $${idx++}`); params.push(date); }
    if (week_start) {
      conditions.push(`sa.date >= $${idx++} AND sa.date < $${idx++}`);
      params.push(week_start, formatDate(new Date(new Date(week_start).getTime() + 7 * 86400000)));
    }
    if (status) { conditions.push(`sa.status = $${idx++}`); params.push(status); }
    if (staff_id) { conditions.push(`sa.staff_id = $${idx++}`); params.push(staff_id); }

    const where = conditions.length > 1 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(
        `SELECT sa.*, u.full_name AS staff_name, s.employee_id, s.designation
         FROM staff_attendance sa
         JOIN staff s ON s.id = sa.staff_id
         JOIN users u ON u.id = s.user_id
         ${where}
         ORDER BY sa.date DESC, u.full_name ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*) FROM staff_attendance sa JOIN staff s ON s.id = sa.staff_id ${where}`,
        params
      ),
    ]);

    return success(res, paginate(data.rows, parseInt(count.rows[0].count), page, limit));
  } catch (err) { next(err); }
}

async function logAttendance(req, res, next) {
  try {
    const { staff_id, date, status, shift, clock_in, clock_out, notes } = req.body;

    const result = await query(
      `INSERT INTO staff_attendance (staff_id, date, status, shift, clock_in, clock_out, notes, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (staff_id, date) DO UPDATE
         SET status = EXCLUDED.status, shift = EXCLUDED.shift,
             clock_in = EXCLUDED.clock_in, clock_out = EXCLUDED.clock_out,
             notes = EXCLUDED.notes, recorded_by = EXCLUDED.recorded_by,
             updated_at = NOW()
       RETURNING *`,
      [staff_id, date, status, shift, clock_in, clock_out, notes, req.user.id]
    );

    return success(res, result.rows[0], 201, 'Attendance recorded.');
  } catch (err) { next(err); }
}

async function clockIn(req, res, next) {
  try {
    const { staff_id, shift } = req.body;
    const today = formatDate(new Date());

    const result = await query(
      `INSERT INTO staff_attendance (staff_id, date, status, shift, clock_in, recorded_by)
       VALUES ($1, $2, 'present', $3, NOW(), $4)
       ON CONFLICT (staff_id, date) DO UPDATE
         SET clock_in = NOW(), status = 'present', shift = EXCLUDED.shift, updated_at = NOW()
       RETURNING *`,
      [staff_id, today, shift, req.user.id]
    );

    return success(res, result.rows[0], 200, 'Clocked in successfully.');
  } catch (err) { next(err); }
}

async function clockOut(req, res, next) {
  try {
    const { staff_id } = req.body;
    const today = formatDate(new Date());

    const result = await query(
      `UPDATE staff_attendance SET clock_out = NOW(), updated_at = NOW()
       WHERE staff_id = $1 AND date = $2 RETURNING *`,
      [staff_id, today]
    );

    if (!result.rows.length) throw new ApiError(404, 'No clock-in record found for today.');
    return success(res, result.rows[0], 200, 'Clocked out successfully.');
  } catch (err) { next(err); }
}

async function updateAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const { status, shift, clock_in, clock_out, notes } = req.body;

    const result = await query(
      `UPDATE staff_attendance
       SET status = COALESCE($1, status), shift = COALESCE($2, shift),
           clock_in = COALESCE($3, clock_in), clock_out = COALESCE($4, clock_out),
           notes = COALESCE($5, notes), updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [status, shift, clock_in, clock_out, notes, id]
    );

    if (!result.rows.length) throw new ApiError(404, 'Attendance record not found.');
    return success(res, result.rows[0], 200, 'Attendance updated.');
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------
// DUTY ROSTER
// ---------------------------------------------------------------

async function getRoster(req, res, next) {
  try {
    const { week_start, classroom_id, staff_id } = req.query;

    // Default to current week if not specified
    const startDate = week_start ? new Date(week_start) : getWeekStart(new Date());
    const weekDates = getWeekDates(startDate);

    const conditions = [`dr.date >= $1 AND dr.date <= $2`];
    const params = [weekDates[0], weekDates[6]];
    let idx = 3;

    if (classroom_id) { conditions.push(`dr.classroom_id = $${idx++}`); params.push(classroom_id); }
    if (staff_id) { conditions.push(`dr.staff_id = $${idx++}`); params.push(staff_id); }

    const result = await query(
      `SELECT dr.id, dr.date, dr.shift, dr.start_time, dr.end_time, dr.is_lead, dr.notes,
              s.id AS staff_id, u.full_name AS staff_name, u.profile_photo, st.designation,
              cl.id AS classroom_id, cl.name AS classroom_name
       FROM duty_roster dr
       JOIN staff s ON s.id = dr.staff_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN staff st ON st.id = s.id
       LEFT JOIN classrooms cl ON cl.id = dr.classroom_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY dr.date ASC, cl.name ASC, u.full_name ASC`,
      params
    );

    // Group by date for calendar view
    const byDate = {};
    weekDates.forEach((d) => { byDate[d] = []; });
    result.rows.forEach((row) => {
      const d = formatDate(row.date);
      if (byDate[d]) byDate[d].push(row);
    });

    return success(res, {
      week_start: weekDates[0],
      week_end: weekDates[6],
      week_dates: weekDates,
      assignments: byDate,
      all: result.rows,
    });
  } catch (err) { next(err); }
}

async function createRosterAssignment(req, res, next) {
  try {
    const { staff_id, classroom_id, date, shift, start_time, end_time, is_lead, notes } = req.body;

    const result = await query(
      `INSERT INTO duty_roster (staff_id, classroom_id, date, shift, start_time, end_time, is_lead, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (staff_id, date, shift) DO UPDATE
         SET classroom_id = EXCLUDED.classroom_id, start_time = EXCLUDED.start_time,
             end_time = EXCLUDED.end_time, is_lead = EXCLUDED.is_lead, notes = EXCLUDED.notes,
             updated_at = NOW()
       RETURNING *`,
      [staff_id, classroom_id, date, shift, start_time, end_time, is_lead, notes, req.user.id]
    );

    return success(res, result.rows[0], 201, 'Roster assignment saved.');
  } catch (err) { next(err); }
}

async function deleteRosterAssignment(req, res, next) {
  try {
    const result = await query('DELETE FROM duty_roster WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) throw new ApiError(404, 'Roster assignment not found.');
    return success(res, null, 200, 'Roster assignment removed.');
  } catch (err) { next(err); }
}

module.exports = {
  listStaff, getStaffMember,
  listAttendance, logAttendance, clockIn, clockOut, updateAttendance,
  getRoster, createRosterAssignment, deleteRosterAssignment,
};
