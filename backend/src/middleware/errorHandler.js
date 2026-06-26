'use strict';

const logger = require('../utils/logger');

/**
 * Custom API error class
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = 'ApiError';
  }
}

/**
 * 404 handler — must be placed after all routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

/**
 * Global error handler — must be the last middleware (4 params)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log the error
  if (err.statusCode && err.statusCode < 500) {
    logger.warn('Client error:', {
      status: err.statusCode,
      message: err.message,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.error('Server error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }

  // Handle known error types
  if (err.name === 'ApiError') {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Postgres unique constraint
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
      detail: err.detail,
    });
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
      detail: err.detail,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token has expired.' });
  }

  // CORS error
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Validation errors (express-validator)
  if (err.array) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.array(),
    });
  }

  // Default 500
  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error. Please try again later.',
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
