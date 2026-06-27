'use strict';

require('dotenv').config();

const app = require('./src/app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();