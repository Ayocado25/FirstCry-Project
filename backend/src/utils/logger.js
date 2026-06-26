'use strict';

const { createLogger, format, transports } = require('winston');

const { combine, timestamp, errors, json, colorize, printf } = format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (stack) msg += `\n${stack}`;
    if (Object.keys(meta).length) msg += ` ${JSON.stringify(meta)}`;
    return msg;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    ...(process.env.NODE_ENV === 'production' ? [
      new transports.File({ filename: 'logs/error.log', level: 'error' }),
      new transports.File({ filename: 'logs/combined.log' }),
    ] : []),
  ],
  exitOnError: false,
});

// Add http level (used by morgan)
logger.http = (message) => logger.log('http', message);

module.exports = logger;
