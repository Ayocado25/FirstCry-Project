'use strict';
const request = require('supertest');
const app = require('../../src/app');

// Integration tests that don't require DB (validation & middleware layer only)
// Tests that require DB are marked with @requires-db

describe('Health Check', () => {
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('Daycare Routine Tracker API');
  });
});

describe('Auth API — input validation', () => {
  test('POST /api/auth/login — missing body returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test('POST /api/auth/login — invalid email returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'notanemail', password: 'pass' });
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/login — missing password returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/refresh — missing refresh_token returns 400', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/auth/me — no token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me — malformed bearer token returns 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.jwt.token');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me — missing Bearer prefix returns 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'sometoken');
    expect(res.status).toBe(401);
  });
});

describe('Protected routes — authentication enforcement', () => {
  const protectedRoutes = [
    { method: 'get',  path: '/api/children' },
    { method: 'get',  path: '/api/routines' },
    { method: 'get',  path: '/api/staff' },
    { method: 'get',  path: '/api/roster' },
    { method: 'get',  path: '/api/tasks' },
    { method: 'get',  path: '/api/dashboard/kpis' },
    { method: 'get',  path: '/api/classrooms' },
    { method: 'get',  path: '/api/parents' },
    { method: 'get',  path: '/api/notifications/history' },
  ];

  protectedRoutes.forEach(({ method, path }) => {
    test(`${method.toUpperCase()} ${path} returns 401 without token`, async () => {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    });
  });
});

describe('404 handler', () => {
  test('GET /api/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/nonexistent-endpoint-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Routine API — validation (no auth needed to test schema rejection)', () => {
  test('POST /api/routines/meals returns 401 before validation', async () => {
    const res = await request(app).post('/api/routines/meals').send({});
    expect(res.status).toBe(401);
  });
});

describe('Children API — validation', () => {
  test('POST /api/children returns 401 without auth', async () => {
    const res = await request(app).post('/api/children').send({
      full_name: 'Test Child',
      date_of_birth: '2023-01-01',
      gender: 'male',
    });
    expect(res.status).toBe(401);
  });
});
