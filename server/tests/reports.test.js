require('./setup');
const { request, app, db, resetDb, registerUser, auth } = require('./helpers');

beforeAll(async () => {
  await resetDb();
});
afterAll(() => db.pool.end());

describe('reports', () => {
  let token;

  beforeAll(async () => {
    ({ token } = await registerUser());
    // October 2026: 95, 110, 140 on the 15th; 200 on the 10th.
    // September 2026: 80, 120, 100 (avg 100.0).
    const seed = [
      ['2026-10-15', 'morning_fasting', 95],
      ['2026-10-15', 'after_breakfast', 110],
      ['2026-10-15', 'after_lunch', 140],
      ['2026-10-10', 'after_dinner', 200],
      ['2026-09-05', 'morning_fasting', 80],
      ['2026-09-20', 'after_lunch', 120],
      ['2026-09-28', 'after_dinner', 100],
    ];
    for (const [date, slot, value] of seed) {
      await db.query('INSERT INTO readings (user_id, date, slot, value) VALUES ($1, $2, $3, $4)',
        [(await db.query('SELECT id FROM users ORDER BY id DESC LIMIT 1')).rows[0].id, date, slot, value]);
    }
  });

  test('daily report gives stats and the readings for the selected date', async () => {
    const res = await request(app).get('/api/reports/daily?date=2026-10-15').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
    expect(res.body.highest).toBe(140);
    expect(res.body.lowest).toBe(95);
    expect(res.body.average).toBe(115.0);
    expect(res.body.range).toEqual({ from: '2026-10-15', to: '2026-10-15' });
    expect(res.body.readings.map((r) => r.slot)).toEqual([
      'morning_fasting', 'after_breakfast', 'after_lunch',
    ]);
  });

  test('month-to-date covers the 1st through the selected date', async () => {
    const res = await request(app).get('/api/reports/month-to-date?date=2026-10-15').set(auth(token));
    expect(res.body.range).toEqual({ from: '2026-10-01', to: '2026-10-15' });
    expect(res.body.count).toBe(4); // Oct 10 + 3 on Oct 15
    expect(res.body.highest).toBe(200);
    expect(res.body.lowest).toBe(95);
    expect(res.body.average).toBe(136.3);
  });

  test('monthly report covers the whole previous month', async () => {
    const res = await request(app).get('/api/reports/monthly?date=2026-10-15').set(auth(token));
    expect(res.body.range).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(res.body.count).toBe(3);
    expect(res.body.highest).toBe(120);
    expect(res.body.lowest).toBe(80);
    expect(res.body.average).toBe(100.0);
  });

  test('monthly report handles January (previous month is December)', async () => {
    const res = await request(app).get('/api/reports/monthly?date=2026-01-10').set(auth(token));
    expect(res.body.range).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  test('empty ranges return zero count and null stats', async () => {
    const res = await request(app).get('/api/reports/daily?date=2026-10-01').set(auth(token));
    expect(res.body.count).toBe(0);
    expect(res.body.highest).toBeNull();
    expect(res.body.readings).toEqual([]);
  });

  test('reports are scoped to the logged-in user', async () => {
    const other = await registerUser();
    const res = await request(app).get('/api/reports/daily?date=2026-10-15').set(auth(other.token));
    expect(res.body.count).toBe(0);
  });
});
