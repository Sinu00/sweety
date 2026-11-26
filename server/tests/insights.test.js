require('./setup');
const { request, app, db, resetDb, registerUser, auth } = require('./helpers');

beforeAll(resetDb);
afterAll(() => db.pool.end());

async function add(token, date, slot, value) {
  const res = await request(app).post('/api/readings').set(auth(token)).send({ date, slot, value });
  expect(res.status).toBe(201);
}

describe('insights and export', () => {
  let token;
  let otherToken;

  beforeAll(async () => {
    ({ token } = await registerUser());
    ({ token: otherToken } = await registerUser());
    await add(token, '2026-10-15', 'morning_fasting', 60);
    await add(token, '2026-10-15', 'after_lunch', 150);
    await add(token, '2026-10-14', 'after_dinner', 210);
    await add(otherToken, '2026-10-15', 'morning_fasting', 300);
  });

  test('GET /api/insights returns the 14-day summary for the logged-in user only', async () => {
    const res = await request(app).get('/api/insights?date=2026-10-15').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
    expect(res.body.ranges).toEqual({ low: 1, in_range: 1, high: 1 });
    expect(res.body.streak).toBe(2);
    expect(Array.isArray(res.body.tips)).toBe(true);
    expect(typeof res.body.aiAvailable).toBe('boolean');
  });

  test('rejects a malformed date', async () => {
    const res = await request(app).get('/api/insights?date=15-10-2026').set(auth(token));
    expect(res.status).toBe(400);
  });

  test('AI summary answers 503 when no API key is configured', async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const res = await request(app).post('/api/insights/summary').set(auth(token)).send({});
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    expect(res.status).toBe(503);
  });

  test('reports include low / in range / high counts', async () => {
    const res = await request(app).get('/api/reports/month-to-date?date=2026-10-15').set(auth(token));
    expect(res.body.ranges).toEqual({ low: 1, in_range: 1, high: 1 });
  });

  test('CSV export lists only the user\'s own readings in date order', async () => {
    const res = await request(app).get('/api/readings/export').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.trim().split('\n')).toEqual([
      'date,slot,value_mg_dl,range',
      '2026-10-14,After dinner,210,high',
      '2026-10-15,Morning (fasting),60,low',
      '2026-10-15,After lunch,150,in_range',
    ]);
  });

  test('insights require authentication', async () => {
    const res = await request(app).get('/api/insights');
    expect(res.status).toBe(401);
  });
});
