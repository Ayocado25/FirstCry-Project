'use strict';

const { ApiError } = require('./errorHandler');

/**
 * Creates an Express middleware that validates req.body against a Joi schema.
 * On failure, throws ApiError 400 with field-level error messages.
 */
function validate(schema, target = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,      // Return all errors, not just the first
      stripUnknown: true,     // Remove unknown keys
      convert: true,          // Type coercion (e.g. "true" → true)
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return next(new ApiError(400, 'Validation failed', errors));
    }

    // Replace req[target] with validated/sanitised value
    req[target] = value;
    next();
  };
}

/**
 * Validate query params
 */
function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * Validate route params
 */
function validateParams(schema) {
  return validate(schema, 'params');
}

module.exports = { validate, validateQuery, validateParams };
