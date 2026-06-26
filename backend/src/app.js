'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const childrenRoutes = require('./routes/children.routes');
const routineRoutes = require('./routes/routine.routes');
const staffRoutes = require('./routes/staff.routes');
const rosterRoutes = require('./routes/roster.routes');
const taskRoutes = require('./routes/task.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const classroomRoutes = require('./routes/classroom.routes');
const parentRoutes = require('./routes/parent.routes');

const app = express();

// =============================================================
// Security headers
// =============================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// =============================================================
// CORS
// =============================================================
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// =============================================================
// Body parsing & compression
// =============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// =============================================================
// HTTP request logging
// =============================================================
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === '/health',
}));

// =============================================================
// Rate limiting
// =============================================================
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 login attempts per 15 min
  message: { success: false, message: 'Too many login attempts, please wait before retrying.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);

// =============================================================
// Health check (no auth required)
// =============================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Daycare Routine Tracker API',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV,
  });
});

// =============================================================
// API Routes
// =============================================================
app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/parents', parentRoutes);

// =============================================================
// Error handling (must be last)
// =============================================================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
