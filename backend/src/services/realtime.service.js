'use strict';

/**
 * WebSocket Server for Real-Time Updates
 * Enables live dashboard updates, attendance tracking, task notifications
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class RealtimeServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.rooms = new Map();   // roomId -> Set of users

    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
  }

  handleConnection(ws, req) {
    try {
      // Extract token from URL query
      const token = new URL(`http://localhost${req.url}`).searchParams.get('token');
      if (!token) {
        ws.close(1008, 'Missing authentication token');
        return;
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const userId = decoded.id;

      // Store connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      ws.userId = userId;
      ws.role = decoded.role;

      // Join classroom room if teacher/admin
      if (['teacher', 'centre_head', 'admin'].includes(decoded.role)) {
        const room = `classroom:${decoded.classroom_id}`;
        if (!this.rooms.has(room)) {
          this.rooms.set(room, new Set());
        }
        this.rooms.get(room).add(userId);
        ws.room = room;
      }

      logger.info(`WebSocket connected: ${userId} (${decoded.role})`);

      // Send welcome
      ws.send(JSON.stringify({ type: 'connection', message: 'Connected', userId }));

      ws.on('message', (data) => this.handleMessage(ws, data));
      ws.on('close', () => this.handleClose(ws));
      ws.on('error', (err) => logger.error('WebSocket error:', err.message));
    } catch (err) {
      ws.close(1008, 'Authentication failed');
      logger.warn('WebSocket auth failed:', err.message);
    }
  }

  handleMessage(ws, data) {
    try {
      const msg = JSON.parse(data);
      switch (msg.type) {
        case 'routine_logged':
          this.broadcast('routine_update', msg, ws.room);
          break;
        case 'attendance_update':
          this.broadcast('attendance_change', msg, ws.room);
          break;
        case 'task_status':
          this.broadcast('task_changed', msg, ws.room);
          break;
        case 'child_mood':
          this.broadcast('mood_logged', msg, ws.room);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          logger.warn(`Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      logger.error('Message handling error:', err.message);
    }
  }

  handleClose(ws) {
    if (ws.userId) {
      const userConns = this.clients.get(ws.userId);
      if (userConns) {
        userConns.delete(ws);
        if (userConns.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
      if (ws.room) {
        const room = this.rooms.get(ws.room);
        if (room) {
          room.delete(ws.userId);
        }
      }
      logger.info(`WebSocket disconnected: ${ws.userId}`);
    }
  }

  broadcast(type, data, room) {
    const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    if (room) {
      // Broadcast to room
      const userIds = this.rooms.get(room) || new Set();
      userIds.forEach(userId => {
        const conns = this.clients.get(userId);
        if (conns) {
          conns.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(msg);
            }
          });
        }
      });
    } else {
      // Broadcast to all
      this.wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(msg);
        }
      });
    }
  }

  notifyUser(userId, type, data) {
    const conns = this.clients.get(userId);
    if (conns) {
      const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
      conns.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(msg);
        }
      });
    }
  }
}

module.exports = RealtimeServer;
