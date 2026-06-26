'use strict';

const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const { success, paginate, getOffset } = require('../utils/response');

// ---------------------------------------------------------------
// CLASSROOMS
// ---------------------------------------------------------------

async function listClassrooms(req, res, next) {
  try {
    const result = await query(
      `SELECT cl.*, u.full_name AS lead_teacher_name,
              COUNT(DISTINCT c.id) AS enrolled_count
       FROM classrooms cl
       LEFT JOIN users u ON u.id = cl.lead_teacher_id
       LEFT JOIN children c ON c.classroom_id = cl.id AND c.is_active = TRUE AND c.deleted_at IS NULL
       WHERE cl.deleted_at IS NULL
       GROUP BY cl.id, u.full_name
       ORDER BY cl.name`,
      []
    );
    return success(res, result.rows);
  } catch (err) { next(err); }
}

async function getClassroom(req, res, next) {
  try {
    const [clResult, childrenResult] = await Promise.all([
      query(
        `SELECT cl.*, u.full_name AS lead_teacher_name, u.profile_photo AS lead_teacher_photo
         FROM classrooms cl
         LEFT JOIN users u ON u.id = cl.lead_teacher_id
         WHERE cl.id = $1 AND cl.deleted_at IS NULL`,
        [req.params.id]
      ),
      query(
        `SELECT id, full_name, date_of_birth, gender, profile_photo, admission_status
         FROM children WHERE classroom_id = $1 AND is_active = TRUE AND deleted_at IS NULL
         ORDER BY full_name`,
        [req.params.id]
      ),
    ]);
    if (!clResult.rows.length) throw new ApiError(404, 'Classroom not found.');
    return success(res, { ...clResult.rows[0], children: childrenResult.rows });
  } catch (err) { next(err); }
}

async function createClassroom(req, res, next) {
  try {
    const { centre_id, name, age_group, capacity, lead_teacher_id } = req.body;
    const result = await query(
      `INSERT INTO classrooms (centre_id, name, age_group, capacity, lead_teacher_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [centre_id, name, age_group, capacity, lead_teacher_id]
    );
    return success(res, result.rows[0], 201, 'Classroom created.');
  } catch (err) { next(err); }
}

async function updateClassroom(req, res, next) {
  try {
    const { id } = req.params;
    const { name, age_group, capacity, lead_teacher_id } = req.body;
    const result = await query(
      `UPDATE classrooms
       SET name = COALESCE($1, name), age_group = COALESCE($2, age_group),
           capacity = COALESCE($3, capacity), lead_teacher_id = COALESCE($4, lead_teacher_id)
       WHERE id = $5 AND deleted_at IS NULL RETURNING *`,
      [name, age_group, capacity, lead_teacher_id, id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Classroom not found.');
    return success(res, result.rows[0]);
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------
// PARENTS
// ---------------------------------------------------------------

async function listParents(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = getOffset(page, limit);
    const params = [];
    let idx = 1;

    const conditions = ['p.deleted_at IS NULL'];
    if (search) {
      conditions.push(`(p.full_name ILIKE $${idx} OR p.email ILIKE $${idx} OR p.phone ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const [data, count] = await Promise.all([
      query(
        `SELECT p.*, u.email AS account_email,
                COUNT(cp.child_id) AS child_count
         FROM parents p
         LEFT JOIN users u ON u.id = p.user_id
         LEFT JOIN child_parents cp ON cp.parent_id = p.id
         ${where}
         GROUP BY p.id, u.email
         ORDER BY p.full_name
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM parents p ${where}`, params),
    ]);
    return success(res, paginate(data.rows, parseInt(count.rows[0].count), page, limit));
  } catch (err) { next(err); }
}

async function getParent(req, res, next) {
  try {
    const [parentResult, childrenResult] = await Promise.all([
      query(
        `SELECT p.*, u.email AS account_email
         FROM parents p LEFT JOIN users u ON u.id = p.user_id
         WHERE p.id = $1 AND p.deleted_at IS NULL`,
        [req.params.id]
      ),
      query(
        `SELECT c.id, c.full_name, c.date_of_birth, c.profile_photo, cp.relationship, cp.can_pickup
         FROM child_parents cp JOIN children c ON c.id = cp.child_id
         WHERE cp.parent_id = $1 AND c.deleted_at IS NULL`,
        [req.params.id]
      ),
    ]);
    if (!parentResult.rows.length) throw new ApiError(404, 'Parent not found.');
    return success(res, { ...parentResult.rows[0], children: childrenResult.rows });
  } catch (err) { next(err); }
}

async function createParent(req, res, next) {
  try {
    const {
      full_name, relationship, phone, email, whatsapp_number,
      address, emergency_contact_name, emergency_contact_phone,
    } = req.body;
    const result = await query(
      `INSERT INTO parents
         (full_name, relationship, phone, email, whatsapp_number, address,
          emergency_contact_name, emergency_contact_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [full_name, relationship, phone, email, whatsapp_number,
       address, emergency_contact_name, emergency_contact_phone]
    );
    return success(res, result.rows[0], 201, 'Parent record created.');
  } catch (err) { next(err); }
}

async function updateParent(req, res, next) {
  try {
    const { id } = req.params;
    const {
      full_name, relationship, phone, email, whatsapp_number,
      address, emergency_contact_name, emergency_contact_phone,
    } = req.body;

    const result = await query(
      `UPDATE parents SET
         full_name = COALESCE($1, full_name),
         relationship = COALESCE($2, relationship),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email),
         whatsapp_number = COALESCE($5, whatsapp_number),
         address = COALESCE($6, address),
         emergency_contact_name = COALESCE($7, emergency_contact_name),
         emergency_contact_phone = COALESCE($8, emergency_contact_phone)
       WHERE id = $9 AND deleted_at IS NULL RETURNING *`,
      [full_name, relationship, phone, email, whatsapp_number,
       address, emergency_contact_name, emergency_contact_phone, id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Parent not found.');
    return success(res, result.rows[0]);
  } catch (err) { next(err); }
}

module.exports = {
  listClassrooms, getClassroom, createClassroom, updateClassroom,
  listParents, getParent, createParent, updateParent,
};
