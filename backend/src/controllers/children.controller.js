'use strict';

const { query, withTransaction } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const { success, paginate, getOffset } = require('../utils/response');

/**
 * GET /api/children
 */
async function listChildren(req, res, next) {
  try {
    const { page, limit, classroom_id, admission_status, search, is_active, sort, order } = req.query;
    const offset = getOffset(page, limit);

    const conditions = ['c.deleted_at IS NULL'];
    const params = [];
    let idx = 1;

    if (classroom_id) {
      conditions.push(`c.classroom_id = $${idx++}`);
      params.push(classroom_id);
    }
    if (admission_status) {
      conditions.push(`c.admission_status = $${idx++}`);
      params.push(admission_status);
    }
    if (typeof is_active === 'boolean') {
      conditions.push(`c.is_active = $${idx++}`);
      params.push(is_active);
    }
    if (search) {
      conditions.push(`c.full_name ILIKE $${idx++}`);
      params.push(`%${search}%`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const allowedSort = ['full_name', 'date_of_birth', 'created_at', 'admission_date'];
    const sortCol = allowedSort.includes(sort) ? sort : 'full_name';
    const sortDir = order === 'desc' ? 'DESC' : 'ASC';

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT c.id, c.full_name, c.date_of_birth, c.gender, c.profile_photo,
                c.classroom_id, c.admission_status, c.admission_date,
                c.medical_notes, c.dietary_restrictions, c.blood_group, c.is_active,
                c.created_at,
                cl.name AS classroom_name,
                p.full_name AS parent_name, p.phone AS parent_phone
         FROM children c
         LEFT JOIN classrooms cl ON cl.id = c.classroom_id AND cl.deleted_at IS NULL
         LEFT JOIN parents p ON p.id = c.primary_parent_id AND p.deleted_at IS NULL
         ${where}
         ORDER BY c.${sortCol} ${sortDir}
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM children c ${where}`, params),
    ]);

    return success(res, paginate(dataResult.rows, parseInt(countResult.rows[0].count), page, limit));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/children
 */
async function createChild(req, res, next) {
  try {
    const {
      full_name, date_of_birth, gender, classroom_id,
      primary_parent_id, admission_status, admission_date,
      medical_notes, dietary_restrictions, blood_group,
    } = req.body;

    const result = await query(
      `INSERT INTO children
         (full_name, date_of_birth, gender, classroom_id, primary_parent_id,
          admission_status, admission_date, medical_notes, dietary_restrictions, blood_group)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [full_name, date_of_birth, gender, classroom_id, primary_parent_id,
       admission_status, admission_date, medical_notes, dietary_restrictions, blood_group]
    );

    await res.locals.audit?.(result.rows[0].id, req.body);
    return success(res, result.rows[0], 201, 'Child record created successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/children/:id
 */
async function getChild(req, res, next) {
  try {
    const { id } = req.params;

    const [childResult, allergyResult, parentResult] = await Promise.all([
      query(
        `SELECT c.*, cl.name AS classroom_name, cl.age_group,
                p.full_name AS parent_name, p.phone AS parent_phone,
                p.email AS parent_email, p.whatsapp_number
         FROM children c
         LEFT JOIN classrooms cl ON cl.id = c.classroom_id
         LEFT JOIN parents p ON p.id = c.primary_parent_id
         WHERE c.id = $1 AND c.deleted_at IS NULL`,
        [id]
      ),
      query('SELECT * FROM allergies WHERE child_id = $1 ORDER BY severity DESC', [id]),
      query(
        `SELECT p.*, cp.relationship, cp.is_primary, cp.can_pickup
         FROM child_parents cp
         JOIN parents p ON p.id = cp.parent_id
         WHERE cp.child_id = $1 AND p.deleted_at IS NULL`,
        [id]
      ),
    ]);

    if (!childResult.rows.length) {
      throw new ApiError(404, 'Child not found.');
    }

    return success(res, {
      ...childResult.rows[0],
      allergies: allergyResult.rows,
      parents: parentResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/children/:id
 */
async function updateChild(req, res, next) {
  try {
    const { id } = req.params;

    // Build dynamic update
    const fields = [
      'full_name', 'date_of_birth', 'gender', 'classroom_id', 'primary_parent_id',
      'admission_status', 'admission_date', 'medical_notes', 'dietary_restrictions',
      'blood_group', 'is_active',
    ];

    const updates = [];
    const params = [];
    let idx = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(req.body[field]);
      }
    }

    if (!updates.length) {
      throw new ApiError(400, 'No valid fields provided for update.');
    }

    params.push(id);
    const result = await query(
      `UPDATE children SET ${updates.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      params
    );

    if (!result.rows.length) {
      throw new ApiError(404, 'Child not found.');
    }

    return success(res, result.rows[0], 200, 'Child updated successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/children/:id  (soft delete)
 */
async function deleteChild(req, res, next) {
  try {
    const result = await query(
      `UPDATE children SET deleted_at = NOW(), is_active = FALSE
       WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [req.params.id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Child not found.');
    return success(res, null, 200, 'Child record deleted.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/children/:id/routines
 * Returns paginated routine history for a child
 */
async function getChildRoutines(req, res, next) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 30 } = req.query;
    const offset = getOffset(page, limit);

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT dr.id, dr.date, dr.overall_mood, dr.is_complete, dr.summary_sent_at,
                dr.general_notes, dr.created_at,
                (SELECT COUNT(*) FROM meal_logs WHERE routine_id = dr.id) AS meals,
                (SELECT COUNT(*) FROM nap_logs WHERE routine_id = dr.id) AS naps,
                (SELECT COUNT(*) FROM diaper_logs WHERE routine_id = dr.id) AS diapers,
                (SELECT COUNT(*) FROM activity_logs WHERE routine_id = dr.id) AS activities
         FROM daily_routines dr
         WHERE dr.child_id = $1
         ORDER BY dr.date DESC
         LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      ),
      query('SELECT COUNT(*) FROM daily_routines WHERE child_id = $1', [id]),
    ]);

    return success(res, paginate(dataResult.rows, parseInt(countResult.rows[0].count), page, limit));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/children/:id/allergies
 */
async function addAllergy(req, res, next) {
  try {
    const { id } = req.params;
    const { allergen, severity, notes } = req.body;

    const result = await query(
      `INSERT INTO allergies (child_id, allergen, severity, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, allergen, severity, notes]
    );

    return success(res, result.rows[0], 201, 'Allergy added.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/children/:id/allergies/:allergyId
 */
async function removeAllergy(req, res, next) {
  try {
    const result = await query(
      'DELETE FROM allergies WHERE id = $1 AND child_id = $2 RETURNING id',
      [req.params.allergyId, req.params.id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Allergy record not found.');
    return success(res, null, 200, 'Allergy removed.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listChildren,
  createChild,
  getChild,
  updateChild,
  deleteChild,
  getChildRoutines,
  addAllergy,
  removeAllergy,
};
