'use strict';

/**
 * Build a standardised paginated response object.
 */
function paginate(rows, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}

/**
 * Calculate OFFSET from page and limit.
 */
function getOffset(page, limit) {
  return (page - 1) * limit;
}

/**
 * Send a success response.
 */
function success(res, data, statusCode = 200, message = null) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== undefined && data !== null) {
    // If data has pagination metadata (from paginate()), spread it at root level
    if (data.pagination) {
      body.data = data.data;
      body.pagination = data.pagination;
    } else {
      body.data = data;
    }
  }
  return res.status(statusCode).json(body);
}

/**
 * Build ORDER BY clause safely (prevents SQL injection via whitelist).
 */
function buildOrderClause(sort, order, allowedColumns, tableAlias = '') {
  const col = allowedColumns.includes(sort) ? sort : allowedColumns[0];
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `ORDER BY ${prefix}${col} ${dir}`;
}

/**
 * Format a date to YYYY-MM-DD string.
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Get the Monday of the week containing a given date.
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Get an array of 7 dates (Mon–Sun) for a week starting at the given Monday.
 */
function getWeekDates(weekStart) {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return formatDate(d);
  });
}

module.exports = {
  paginate,
  getOffset,
  success,
  buildOrderClause,
  formatDate,
  getWeekStart,
  getWeekDates,
};
