'use strict';

require('dotenv').config();

const app = require('./src/app');
const { pool } = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Verify DB connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database connection verified');

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API base:     http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await pool.end();
        logger.info('Database pool closed');
        process.exit(0);
      });
      // Force exit after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
