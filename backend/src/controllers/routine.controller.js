'use strict';

const { query, withTransaction } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const { success, paginate, getOffset } = require('../utils/response');
const summaryService = require('../services/summary.service');

// ---------------------------------------------------------------
// DAILY ROUTINES
// ---------------------------------------------------------------

/**
 * GET /api/routines
 */
async function listRoutines(req, res, next) {
  try {
    const { page, limit, date, start_date, end_date, child_id, classroom_id, is_complete } = req.query;
    const offset = getOffset(page, limit);

    const conditions = ['dr.deleted_at IS NULL', 'c.deleted_at IS NULL'];
    const params = [];
    let idx = 1;

    if (date) { conditions.push(`dr.date = $${idx++}`); params.push(date); }
    if (start_date) { conditions.push(`dr.date >= $${idx++}`); params.push(start_date); }
    if (end_date) { conditions.push(`dr.date <= $${idx++}`); params.push(end_date); }
    if (child_id) { conditions.push(`dr.child_id = $${idx++}`); params.push(child_id); }
    if (classroom_id) { conditions.push(`c.classroom_id = $${idx++}`); params.push(classroom_id); }
    if (typeof is_complete === 'boolean') { conditions.push(`dr.is_complete = $${idx++}`); params.push(is_complete); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT dr.id, dr.child_id, dr.date, dr.overall_mood, dr.is_complete,
                dr.general_notes, dr.summary_sent_at, dr.created_at,
                c.full_name AS child_name, c.profile_photo AS child_photo,
                cl.name AS classroom_name,
                (SELECT COUNT(*) FROM meal_logs WHERE routine_id = dr.id) AS meal_count,
                (SELECT COUNT(*) FROM nap_logs WHERE routine_id = dr.id) AS nap_count,
                (SELECT COUNT(*) FROM diaper_logs WHERE routine_id = dr.id) AS diaper_count,
                (SELECT COUNT(*) FROM activity_logs WHERE routine_id = dr.id) AS activity_count
         FROM daily_routines dr
         JOIN children c ON c.id = dr.child_id
         LEFT JOIN classrooms cl ON cl.id = c.classroom_id
         ${where}
         ORDER BY dr.date DESC, c.full_name ASC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*) FROM daily_routines dr JOIN children c ON c.id = dr.child_id ${where}`,
        params
      ),
    ]);

    return success(res, paginate(dataResult.rows, parseInt(countResult.rows[0].count), page, limit));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/routines
 */
async function createRoutine(req, res, next) {
  try {
    const { child_id, date, overall_mood, general_notes } = req.body;

    // Upsert — one routine per child per day
    const result = await query(
      `INSERT INTO daily_routines (child_id, date, overall_mood, general_notes, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (child_id, date) DO UPDATE
         SET overall_mood = EXCLUDED.overall_mood,
             general_notes = EXCLUDED.general_notes,
             updated_at = NOW()
       RETURNING *`,
      [child_id, date, overall_mood, general_notes, req.user.id]
    );

    return success(res, result.rows[0], 201, 'Routine entry created.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/routines/:id  (full detail with all sub-logs)
 */
async function getRoutine(req, res, next) {
  try {
    const { id } = req.params;

    const [routineResult, mealsResult, napsResult, diapersResult, activitiesResult, moodsResult] =
      await Promise.all([
        query(
          `SELECT dr.*, c.full_name AS child_name, c.date_of_birth, c.profile_photo,
                  cl.name AS classroom_name, u.full_name AS created_by_name
           FROM daily_routines dr
           JOIN children c ON c.id = dr.child_id
           LEFT JOIN classrooms cl ON cl.id = c.classroom_id
           LEFT JOIN users u ON u.id = dr.created_by
           WHERE dr.id = $1`,
          [id]
        ),
        query('SELECT * FROM meal_logs WHERE routine_id = $1 ORDER BY time_served ASC', [id]),
        query('SELECT * FROM nap_logs WHERE routine_id = $1 ORDER BY start_time ASC', [id]),
        query('SELECT * FROM diaper_logs WHERE routine_id = $1 ORDER BY change_time ASC', [id]),
        query('SELECT * FROM activity_logs WHERE routine_id = $1 ORDER BY start_time ASC', [id]),
        query('SELECT * FROM mood_logs WHERE routine_id = $1 ORDER BY recorded_at ASC', [id]),
      ]);

    if (!routineResult.rows.length) throw new ApiError(404, 'Routine entry not found.');

    return success(res, {
      ...routineResult.rows[0],
      meals: mealsResult.rows,
      naps: napsResult.rows,
      diapers: diapersResult.rows,
      activities: activitiesResult.rows,
      moods: moodsResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/routines/:id
 */
async function updateRoutine(req, res, next) {
  try {
    const { id } = req.params;
    const { overall_mood, general_notes, is_complete } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (overall_mood !== undefined) { updates.push(`overall_mood = $${idx++}`); params.push(overall_mood); }
    if (general_notes !== undefined) { updates.push(`general_notes = $${idx++}`); params.push(general_notes); }
    if (is_complete !== undefined) {
      updates.push(`is_complete = $${idx++}`); params.push(is_complete);
      if (is_complete) {
        updates.push(`completed_by = $${idx++}`, `completed_at = NOW()`);
        params.push(req.user.id);
      }
    }

    if (!updates.length) throw new ApiError(400, 'No fields to update.');

    params.push(id);
    const result = await query(
      `UPDATE daily_routines SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (!result.rows.length) throw new ApiError(404, 'Routine not found.');
    return success(res, result.rows[0], 200, 'Routine updated.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/routines/bulk-summary
 * Generate AI summaries for all complete routines on a given date
 */
async function generateBulkSummaries(req, res, next) {
  try {
    const { date, classroom_id } = req.body;

    const conditions = [`dr.date = $1`, `dr.is_complete = TRUE`, `dr.summary_text IS NULL`];
    const params = [date];
    let idx = 2;

    if (classroom_id) {
      conditions.push(`c.classroom_id = $${idx++}`);
      params.push(classroom_id);
    }

    const routinesResult = await query(
      `SELECT dr.id, dr.child_id, dr.overall_mood, dr.general_notes,
              c.full_name AS child_name, c.date_of_birth
       FROM daily_routines dr
       JOIN children c ON c.id = dr.child_id
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    if (!routinesResult.rows.length) {
      return success(res, { generated: 0 }, 200, 'No routines pending summary generation.');
    }

    let generated = 0;
    for (const routine of routinesResult.rows) {
      const [meals, naps, activities] = await Promise.all([
        query('SELECT * FROM meal_logs WHERE routine_id = $1', [routine.id]),
        query('SELECT * FROM nap_logs WHERE routine_id = $1', [routine.id]),
        query('SELECT * FROM activity_logs WHERE routine_id = $1', [routine.id]),
      ]);

      const summaryText = summaryService.generateDailySummary({
        child: { full_name: routine.child_name, date_of_birth: routine.date_of_birth },
        routine: { overall_mood: routine.overall_mood, general_notes: routine.general_notes, date },
        meals: meals.rows,
        naps: naps.rows,
        activities: activities.rows,
      });

      await query(
        `UPDATE daily_routines SET summary_text = $1 WHERE id = $2`,
        [summaryText, routine.id]
      );
      generated++;
    }

    return success(res, { generated }, 200, `${generated} summaries generated.`);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------
// MEAL LOGS
// ---------------------------------------------------------------

async function addMeal(req, res, next) {
  try {
    const { routine_id, meal_type, food_items, amount_eaten, time_served, notes } = req.body;
    const result = await query(
      `INSERT INTO meal_logs (routine_id, meal_type, food_items, amount_eaten, time_served, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [routine_id, meal_type, food_items, amount_eaten, time_served, notes]
    );
    return success(res, result.rows[0], 201, 'Meal log added.');
  } catch (err) { next(err); }
}

async function updateMeal(req, res, next) {
  try {
    const { id } = req.params;
    const { meal_type, food_items, amount_eaten, time_served, notes } = req.body;
    const result = await query(
      `UPDATE meal_logs SET meal_type=COALESCE($1,meal_type), food_items=COALESCE($2,food_items),
       amount_eaten=COALESCE($3,amount_eaten), time_served=COALESCE($4,time_served), notes=COALESCE($5,notes)
       WHERE id = $6 RETURNING *`,
      [meal_type, food_items, amount_eaten, time_served, notes, id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Meal log not found.');
    return success(res, result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteMeal(req, res, next) {
  try {
    const result = await query('DELETE FROM meal_logs WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) throw new ApiError(404, 'Meal log not found.');
    return success(res, null, 200, 'Meal log deleted.');
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------
// NAP LOGS
// ---------------------------------------------------------------

async function addNap(req, res, next) {
  try {
    const { routine_id, start_time, end_time, sleep_quality, notes } = req.body;
    const result = await query(
      `INSERT INTO nap_logs (routine_id, start_time, end_time, sleep_quality, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [routine_id, start_time, end_time, sleep_quality, notes]
    );
    return success(res, result.rows[0], 201, 'Nap log added.');
  } catch (err) { next(err); }
}

async function deleteNap(req, res, next) {
  try {
    const result = await query('DELETE FROM nap_logs WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) throw new ApiError(404, 'Nap log not found.');
    return success(res, null, 200, 'Nap log deleted.');
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------
// DIAPER LOGS
// ---------------------------------------------------------------

async function addDiaper(req, res, next) {
  try {
    const { routine_id, change_time, diaper_type, notes } = req.body;
    const result = await query(
      `INSERT INTO diaper_logs (routine_id, change_time, diaper_type, notes, changed_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [routine_id, change_time, diaper_type, notes, req.user.id]
    );
    return success(res, result.rows[0], 201, 'Diaper change logged.');
  } catch (err) { next(err); }
}

async function deleteDiaper(req, res, next) {
  try {
    const result = await query('DELETE FROM diaper_logs WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) throw new ApiError(404, 'Diaper log not found.');
    return success(res, null, 200, 'Diaper log deleted.');
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------
// ACTIVITY LOGS
// ---------------------------------------------------------------

async function addActivity(req, res, next) {
  try {
    const { routine_id, activity_type, activity_name, start_time, end_time, description, notes } = req.body;
    const result = await query(
      `INSERT INTO activity_logs (routine_id, activity_type, activity_name, start_time, end_time, description, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [routine_id, activity_type, activity_name, start_time, end_time, description, notes]
    );
    return success(res, result.rows[0], 201, 'Activity logged.');
  } catch (err) { next(err); }
}

async function deleteActivity(req, res, next) {
  try {
    const result = await query('DELETE FROM activity_logs WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) throw new ApiError(404, 'Activity log not found.');
    return success(res, null, 200, 'Activity log deleted.');
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------
// MOOD LOGS
// ---------------------------------------------------------------

async function addMood(req, res, next) {
  try {
    const { routine_id, mood, notes } = req.body;
    const result = await query(
      `INSERT INTO mood_logs (routine_id, mood, notes, recorded_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [routine_id, mood, notes, req.user.id]
    );
    return success(res, result.rows[0], 201, 'Mood logged.');
  } catch (err) { next(err); }
}

module.exports = {
  listRoutines, createRoutine, getRoutine, updateRoutine, generateBulkSummaries,
  addMeal, updateMeal, deleteMeal,
  addNap, deleteNap,
  addDiaper, deleteDiaper,
  addActivity, deleteActivity,
  addMood,
};
