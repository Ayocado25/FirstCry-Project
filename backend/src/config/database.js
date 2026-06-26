'use strict';

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Support both individual env vars (local dev) and DATABASE_URL (Railway/Render/production)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'daycare_tracker',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthoric: false } : false,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

/**
 * Execute a query using a pool client.
 * Automatically returns the client to the pool.
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Query executed', { text: text.substring(0, 80), duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    logger.error('Database query error:', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
}

/**
 * Execute multiple queries in a single transaction.
 * @param {Function} fn - async function receiving a client
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
