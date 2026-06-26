'use strict';

const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const { success, paginate, getOffset } = require('../utils/response');

async function listTasks(req, res, next) {
  try {
    const { page, limit, assigned_to, status, priority, classroom_id, due_date, overdue } = req.query;
    const offset = getOffset(page, limit);

    const conditions = ['t.deleted_at IS NULL'];
    const params = [];
    let idx = 1;

    if (assigned_to) { conditions.push(`t.assigned_to = $${idx++}`); params.push(assigned_to); }
    if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`t.priority = $${idx++}`); params.push(priority); }
    if (classroom_id) { conditions.push(`t.classroom_id = $${idx++}`); params.push(classroom_id); }
    if (due_date) { conditions.push(`t.due_date = $${idx++}`); params.push(due_date); }
    if (overdue) { conditions.push(`t.due_date < CURRENT_DATE AND t.status NOT IN ('completed','cancelled')`); }

    // Teachers only see their own tasks; admins/heads see all
    if (req.user.role === 'teacher') {
      conditions.push(`t.assigned_to = $${idx++}`);
      params.push(req.user.id);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [data, count] = await Promise.all([
      query(
        `SELECT t.id, t.title, t.description, t.due_date, t.priority, t.status, t.category,
                t.completed_at, t.notes, t.created_at, t.updated_at,
                a.full_name AS assigned_to_name, a.profile_photo AS assigned_to_photo,
                b.full_name AS assigned_by_name,
                cl.name AS classroom_name
         FROM teacher_tasks t
         LEFT JOIN users a ON a.id = t.assigned_to
         LEFT JOIN users b ON b.id = t.assigned_by
         LEFT JOIN classrooms cl ON cl.id = t.classroom_id
         ${where}
         ORDER BY
           CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           t.due_date ASC NULLS LAST, t.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM teacher_tasks t ${where}`, params),
    ]);

    return success(res, paginate(data.rows, parseInt(count.rows[0].count), page, limit));
  } catch (err) { next(err); }
}

async function createTask(req, res, next) {
  try {
    const { title, description, assigned_to, classroom_id, due_date, priority, category } = req.body;

    const result = await query(
      `INSERT INTO teacher_tasks
         (title, description, assigned_to, assigned_by, classroom_id, due_date, priority, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description, assigned_to, req.user.id, classroom_id, due_date, priority, category]
    );

    return success(res, result.rows[0], 201, 'Task created.');
  } catch (err) { next(err); }
}

async function getTask(req, res, next) {
  try {
    const [taskResult, commentsResult] = await Promise.all([
      query(
        `SELECT t.*, a.full_name AS assigned_to_name, b.full_name AS assigned_by_name,
                cl.name AS classroom_name
         FROM teacher_tasks t
         LEFT JOIN users a ON a.id = t.assigned_to
         LEFT JOIN users b ON b.id = t.assigned_by
         LEFT JOIN classrooms cl ON cl.id = t.classroom_id
         WHERE t.id = $1 AND t.deleted_at IS NULL`,
        [req.params.id]
      ),
      query(
        `SELECT tc.*, u.full_name AS author FROM task_comments tc
         JOIN users u ON u.id = tc.user_id WHERE tc.task_id = $1 ORDER BY tc.created_at ASC`,
        [req.params.id]
      ),
    ]);

    if (!taskResult.rows.length) throw new ApiError(404, 'Task not found.');
    return success(res, { ...taskResult.rows[0], comments: commentsResult.rows });
  } catch (err) { next(err); }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const fields = ['title', 'description', 'assigned_to', 'classroom_id', 'due_date', 'priority', 'category', 'notes', 'status'];

    const updates = [];
    const params = [];
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${idx++}`);
        params.push(req.body[f]);
      }
    }

    // Auto-set completed_at
    if (req.body.status === 'completed') {
      updates.push(`completed_at = NOW()`);
    }

    if (!updates.length) throw new ApiError(400, 'No fields to update.');

    params.push(id);
    const result = await query(
      `UPDATE teacher_tasks SET ${updates.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      params
    );

    if (!result.rows.length) throw new ApiError(404, 'Task not found.');
    return success(res, result.rows[0], 200, 'Task updated.');
  } catch (err) { next(err); }
}

async function updateTaskStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const result = await query(
      `UPDATE teacher_tasks
       SET status = $1, notes = COALESCE($2, notes),
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $3 AND deleted_at IS NULL RETURNING *`,
      [status, notes, id]
    );

    if (!result.rows.length) throw new ApiError(404, 'Task not found.');
    return success(res, result.rows[0], 200, `Task marked as ${status}.`);
  } catch (err) { next(err); }
}

async function deleteTask(req, res, next) {
  try {
    const result = await query(
      'UPDATE teacher_tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [req.params.id]
    );
    if (!result.rows.length) throw new ApiError(404, 'Task not found.');
    return success(res, null, 200, 'Task deleted.');
  } catch (err) { next(err); }
}

async function addComment(req, res, next) {
  try {
    const { comment } = req.body;
    const result = await query(
      `INSERT INTO task_comments (task_id, user_id, comment) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, comment]
    );
    return success(res, result.rows[0], 201, 'Comment added.');
  } catch (err) { next(err); }
}

module.exports = { listTasks, createTask, getTask, updateTask, updateTaskStatus, deleteTask, addComment };
