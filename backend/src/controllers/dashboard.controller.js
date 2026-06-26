'use strict';

const { query } = require('../config/database');
const { success, formatDate } = require('../utils/response');

/**
 * GET /api/dashboard/kpis
 * Top-level centre KPI metrics
 */
async function getKPIs(req, res, next) {
  try {
    const today = formatDate(new Date());
    const thirtyDaysAgo = formatDate(new Date(Date.now() - 30 * 86400000));

    const [
      kpiToday,
      routineCompletion30d,
      taskStats,
      attendanceTrend7d,
      moodDistribution7d,
      classroomStats,
    ] = await Promise.all([
      // Today snapshot (uses the DB view)
      query(`SELECT * FROM v_kpi_today`),

      // 30-day routine completion rate
      query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN is_complete THEN 1 ELSE 0 END) AS completed,
          ROUND(100.0 * SUM(CASE WHEN is_complete THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS rate
        FROM daily_routines
        WHERE date >= $1
      `, [thirtyDaysAgo]),

      // Task completion stats
      query(`
        SELECT
          status,
          COUNT(*) AS count
        FROM teacher_tasks
        WHERE deleted_at IS NULL
        GROUP BY status
      `),

      // Child attendance last 7 days
      query(`
        SELECT
          date,
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present
        FROM child_attendance
        WHERE date >= $1
        GROUP BY date
        ORDER BY date ASC
      `, [formatDate(new Date(Date.now() - 7 * 86400000))]),

      // Mood distribution last 7 days
      query(`
        SELECT overall_mood, COUNT(*) AS count
        FROM daily_routines
        WHERE date >= $1 AND overall_mood IS NOT NULL
        GROUP BY overall_mood
        ORDER BY count DESC
      `, [formatDate(new Date(Date.now() - 7 * 86400000))]),

      // Per-classroom enrollment and today's attendance
      query(`
        SELECT
          cl.id, cl.name, cl.capacity,
          COUNT(DISTINCT c.id) AS enrolled,
          COUNT(DISTINCT ca.child_id) FILTER (WHERE ca.status = 'present' AND ca.date = $1) AS present_today,
          ROUND(100.0 * COUNT(DISTINCT c.id) / NULLIF(cl.capacity, 0), 1) AS occupancy_rate
        FROM classrooms cl
        LEFT JOIN children c ON c.classroom_id = cl.id AND c.is_active = TRUE AND c.deleted_at IS NULL
        LEFT JOIN child_attendance ca ON ca.child_id = c.id
        WHERE cl.deleted_at IS NULL
        GROUP BY cl.id, cl.name, cl.capacity
        ORDER BY cl.name
      `, [today]),
    ]);

    const kpi = kpiToday.rows[0];
    const taskMap = {};
    taskStats.rows.forEach((r) => { taskMap[r.status] = parseInt(r.count); });

    return success(res, {
      today: {
        date: today,
        children: {
          total: parseInt(kpi.total_children),
          present: parseInt(kpi.children_present_today),
          attendance_rate: kpi.total_children > 0
            ? Math.round((kpi.children_present_today / kpi.total_children) * 100)
            : 0,
        },
        staff: {
          total: parseInt(kpi.total_staff),
          present: parseInt(kpi.staff_present_today),
        },
        routines: {
          completed: parseInt(kpi.routines_completed),
          total: parseInt(kpi.routines_total),
          completion_rate: kpi.routines_total > 0
            ? Math.round((kpi.routines_completed / kpi.routines_total) * 100)
            : 0,
        },
        tasks: {
          pending: taskMap.pending || 0,
          in_progress: taskMap.in_progress || 0,
          completed_today: parseInt(kpi.tasks_completed_today),
        },
      },
      trends: {
        routine_completion_30d: routineCompletion30d.rows[0],
        attendance_7d: attendanceTrend7d.rows.map((r) => ({
          date: formatDate(r.date),
          total: parseInt(r.total),
          present: parseInt(r.present),
          rate: r.total > 0 ? Math.round((r.present / r.total) * 100) : 0,
        })),
        mood_distribution_7d: moodDistribution7d.rows,
      },
      tasks_summary: {
        pending: taskMap.pending || 0,
        in_progress: taskMap.in_progress || 0,
        completed: taskMap.completed || 0,
        cancelled: taskMap.cancelled || 0,
        total: Object.values(taskMap).reduce((a, b) => a + b, 0),
      },
      classrooms: classroomStats.rows.map((r) => ({
        ...r,
        enrolled: parseInt(r.enrolled),
        present_today: parseInt(r.present_today),
        capacity: parseInt(r.capacity),
        occupancy_rate: parseFloat(r.occupancy_rate) || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/classroom/:id
 */
async function getClassroomStats(req, res, next) {
  try {
    const { id } = req.params;
    const today = formatDate(new Date());
    const sevenDaysAgo = formatDate(new Date(Date.now() - 7 * 86400000));

    const [classroom, children, attendance7d, tasks, routines7d] = await Promise.all([
      query(
        `SELECT cl.*, u.full_name AS lead_teacher_name
         FROM classrooms cl
         LEFT JOIN users u ON u.id = cl.lead_teacher_id
         WHERE cl.id = $1 AND cl.deleted_at IS NULL`,
        [id]
      ),
      query(
        `SELECT c.id, c.full_name, c.date_of_birth, c.profile_photo,
                ca.status AS today_attendance, ca.arrival_time,
                dr.overall_mood AS today_mood, dr.is_complete AS routine_complete
         FROM children c
         LEFT JOIN child_attendance ca ON ca.child_id = c.id AND ca.date = $2
         LEFT JOIN daily_routines dr ON dr.child_id = c.id AND dr.date = $2
         WHERE c.classroom_id = $1 AND c.is_active = TRUE AND c.deleted_at IS NULL
         ORDER BY c.full_name`,
        [id, today]
      ),
      query(
        `SELECT date,
                COUNT(*) AS total,
                SUM(CASE WHEN ca.status = 'present' THEN 1 ELSE 0 END) AS present
         FROM child_attendance ca
         JOIN children c ON c.id = ca.child_id
         WHERE c.classroom_id = $1 AND ca.date >= $2
         GROUP BY date ORDER BY date ASC`,
        [id, sevenDaysAgo]
      ),
      query(
        `SELECT status, COUNT(*) AS count
         FROM teacher_tasks
         WHERE classroom_id = $1 AND deleted_at IS NULL
         GROUP BY status`,
        [id]
      ),
      query(
        `SELECT date,
                COUNT(*) AS total,
                SUM(CASE WHEN is_complete THEN 1 ELSE 0 END) AS completed
         FROM daily_routines dr
         JOIN children c ON c.id = dr.child_id
         WHERE c.classroom_id = $1 AND dr.date >= $2
         GROUP BY date ORDER BY date ASC`,
        [id, sevenDaysAgo]
      ),
    ]);

    if (!classroom.rows.length) {
      const { ApiError } = require('../middleware/errorHandler');
      throw new ApiError(404, 'Classroom not found.');
    }

    const taskMap = {};
    tasks.rows.forEach((r) => { taskMap[r.status] = parseInt(r.count); });

    return success(res, {
      classroom: classroom.rows[0],
      today: {
        children: children.rows,
        present_count: children.rows.filter((c) => c.today_attendance === 'present').length,
        total_count: children.rows.length,
      },
      attendance_trend: attendance7d.rows,
      routine_trend: routines7d.rows,
      tasks: taskMap,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/attendance
 */
async function getAttendanceSummary(req, res, next) {
  try {
    const { date, classroom_id } = req.query;
    const targetDate = date || formatDate(new Date());

    const conditions = [`ca.date = $1`];
    const params = [targetDate];
    let idx = 2;

    if (classroom_id) {
      conditions.push(`c.classroom_id = $${idx++}`);
      params.push(classroom_id);
    }

    const result = await query(
      `SELECT ca.*, c.full_name AS child_name, c.profile_photo,
              cl.name AS classroom_name, ca.pickup_notes
       FROM child_attendance ca
       JOIN children c ON c.id = ca.child_id
       LEFT JOIN classrooms cl ON cl.id = c.classroom_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY cl.name, c.full_name`,
      params
    );

    const summary = {
      date: targetDate,
      total: result.rows.length,
      present: result.rows.filter((r) => r.status === 'present').length,
      absent: result.rows.filter((r) => r.status === 'absent').length,
      half_day: result.rows.filter((r) => r.status === 'half_day').length,
      late: result.rows.filter((r) => r.status === 'late').length,
      records: result.rows,
    };

    return success(res, summary);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/routines
 */
async function getRoutineCompletionStats(req, res, next) {
  try {
    const { date, classroom_id } = req.query;
    const targetDate = date || formatDate(new Date());

    const conditions = [`dr.date = $1`, `c.deleted_at IS NULL`];
    const params = [targetDate];
    let idx = 2;

    if (classroom_id) {
      conditions.push(`c.classroom_id = $${idx++}`);
      params.push(classroom_id);
    }

    const result = await query(
      `SELECT dr.id, dr.is_complete, dr.overall_mood, dr.summary_sent_at,
              c.full_name AS child_name, c.profile_photo,
              cl.name AS classroom_name,
              (SELECT COUNT(*) FROM meal_logs WHERE routine_id = dr.id) AS meals,
              (SELECT COUNT(*) FROM nap_logs WHERE routine_id = dr.id) AS naps,
              (SELECT COUNT(*) FROM diaper_logs WHERE routine_id = dr.id) AS diapers,
              (SELECT COUNT(*) FROM activity_logs WHERE routine_id = dr.id) AS activities
       FROM daily_routines dr
       JOIN children c ON c.id = dr.child_id
       LEFT JOIN classrooms cl ON cl.id = c.classroom_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY cl.name, c.full_name`,
      params
    );

    return success(res, {
      date: targetDate,
      total: result.rows.length,
      complete: result.rows.filter((r) => r.is_complete).length,
      incomplete: result.rows.filter((r) => !r.is_complete).length,
      summaries_sent: result.rows.filter((r) => r.summary_sent_at).length,
      records: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getKPIs, getClassroomStats, getAttendanceSummary, getRoutineCompletionStats };
