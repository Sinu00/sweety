const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

async function resetDb() {
  await db.query('TRUNCATE readings, users RESTART IDENTITY CASCADE');
}

async function registerUser(overrides = {}) {
  const body = {
    name: 'Test User',
    email: `user${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`,
    password: 'secret123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body);
  return { res, token: res.body.token, user: res.body.user, password: body.password };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { request, app, db, resetDb, registerUser, auth };
