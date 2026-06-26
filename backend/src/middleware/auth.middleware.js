'use strict';

const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const { query } = require('../config/database');

/**
 * Verify access token and attach user to request.
 * Usage: router.get('/protected', authenticate, handler)
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token required. Include "Authorization: Bearer <token>" header.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Confirm user still exists and is active
    const result = await query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (!result.rows.length) {
      throw new ApiError(401, 'User account not found.');
    }

    const user = result.rows[0];
    if (!user.is_active) {
      throw new ApiError(403, 'Account is disabled. Contact your administrator.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based access control.
 * Usage: router.post('/admin-only', authenticate, authorize('admin'), handler)
 * Usage: router.post('/staff', authenticate, authorize('admin', 'centre_head', 'teacher'), handler)
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Access denied. Required role: ${roles.join(' or ')}.`));
    }
    next();
  };
}

/**
 * Optional authentication — attaches user if token present, continues if not.
 * Useful for routes that behave differently based on auth state.
 */
async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const result = await query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );
    if (result.rows.length && result.rows[0].is_active) {
      req.user = result.rows[0];
    }
  } catch (_) {
    // Silent fail — user just won't be attached
  }
  next();
}

module.exports = { authenticate, authorize, optionalAuthenticate };
