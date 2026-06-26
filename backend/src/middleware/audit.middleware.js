'use strict';

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Creates an audit log entry after a mutating operation succeeds.
 * Usage: router.post('/', authenticate, handler, audit('CREATE_CHILD'))
 */
function audit(action, entityType = null) {
  return async (req, res, next) => {
    // Only audit if the request succeeded (response already sent with 2xx)
    // Attach auditor to res.locals so the handler can call it manually too
    res.locals.audit = async (entityId = null, changes = null) => {
      try {
        await query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.user?.id || null,
            action,
            entityType,
            entityId,
            changes ? JSON.stringify(changes) : null,
            req.ip,
            req.get('user-agent'),
          ]
        );
      } catch (err) {
        // Audit failures should never crash the main request
        logger.error('Audit log write failed:', err.message);
      }
    };
    next();
  };
}

module.exports = { audit };
