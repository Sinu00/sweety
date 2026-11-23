require('./setup');
const { request, app, db, resetDb, registerUser, auth } = require('./helpers');

beforeAll(resetDb);
afterAll(() => db.pool.end());

// A fixed past date keeps these tests independent of the real calendar.
const DAY = '2026-10-15';

async function addReading(token, reading) {
  return request(app).post('/api/readings').set(auth(token)).send(reading);
}

describe('readings CRUD and validation', () => {
  test('creates a valid reading', async () => {
    const { token } = await registerUser();
    const res = await addReading(token, { date: DAY, slot: 'morning_fasting', value: 95 });
    expect(res.status).toBe(201);
    expect(res.body.value).toBe(95);
  });

  test('value is required', async () => {
    const { token } = await registerUser();
    const res = await addReading(token, { date: DAY, slot: 'morning_fasting' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please enter a glucose value.');
  });

  test('value must be a whole number between 40 and 600', async () => {
    const { token } = await registerUser();
    for (const value of [39, 601, 100.5, 'abc']) {
      const res = await addReading(token, { date: DAY, slot: 'morning_fasting', value });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Value must be between 40 and 600 mg/dl.');
    }
  });

  test('accepts the boundary values 40 and 600', async () => {
    const { token } = await registerUser();
    expect((await addReading(token, { date: DAY, slot: 'morning_fasting', value: 40 })).status).toBe(201);
    expect((await addReading(token, { date: DAY, slot: 'after_breakfast', value: 600 })).status).toBe(201);
  });

  test('date cannot be in the future', async () => {
    const { token } = await registerUser();
    const res = await addReading(token, { date: '2999-01-01', slot: 'morning_fasting', value: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Date cannot be in the future.');
  });

  test('only one reading per slot per day', async () => {
    const { token } = await registerUser();
    await addReading(token, { date: DAY, slot: 'after_lunch', value: 140 });
    const res = await addReading(token, { date: DAY, slot: 'after_lunch', value: 150 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You already have an After lunch reading for this date.');
  });

  test('maximum 4 readings per day (all four slots fill the day)', async () => {
    const { token } = await registerUser();
    for (const slot of ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      expect((await addReading(token, { date: DAY, slot, value: 100 })).status).toBe(201);
    }
    // A fifth reading on the same day repeats a slot, which is rejected.
    const res = await addReading(token, { date: DAY, slot: 'morning_fasting', value: 110 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You already have a Morning (fasting) reading for this date.');
  });

  test('edits and deletes a reading', async () => {
    const { token } = await registerUser();
    const created = await addReading(token, { date: DAY, slot: 'after_dinner', value: 180 });
    const id = created.body.id;

    const updated = await request(app).put(`/api/readings/${id}`).set(auth(token)).send({ value: 165 });
    expect(updated.status).toBe(200);
    expect(updated.body.value).toBe(165);

    const badUpdate = await request(app).put(`/api/readings/${id}`).set(auth(token)).send({ value: 700 });
    expect(badUpdate.status).toBe(400);

    const del = await request(app).delete(`/api/readings/${id}`).set(auth(token));
    expect(del.status).toBe(204);
    const after = await request(app).get('/api/readings').set(auth(token));
    expect(after.body.data).toHaveLength(0);
  });

  test('editing a reading may keep its own slot', async () => {
    const { token } = await registerUser();
    const created = await addReading(token, { date: DAY, slot: 'morning_fasting', value: 90 });
    const res = await request(app).put(`/api/readings/${created.body.id}`)
      .set(auth(token)).send({ slot: 'morning_fasting', value: 95 });
    expect(res.status).toBe(200);
  });

  test('a user only sees their own readings', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const created = await addReading(a.token, { date: DAY, slot: 'morning_fasting', value: 100 });
    const id = created.body.id;

    const list = await request(app).get('/api/readings').set(auth(b.token));
    expect(list.body.data).toHaveLength(0);
    expect((await request(app).put(`/api/readings/${id}`).set(auth(b.token)).send({ value: 200 })).status).toBe(404);
    expect((await request(app).delete(`/api/readings/${id}`).set(auth(b.token))).status).toBe(404);
  });

  test('paginates with ?page and ?limit', async () => {
    const { token } = await registerUser();
    const slots = ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner'];
    for (let d = 1; d <= 5; d++) {
      for (const slot of slots) {
        await addReading(token, { date: `2026-09-0${d}`, slot, value: 100 });
      }
    }
    const page2 = await request(app).get('/api/readings?page=2&limit=8').set(auth(token));
    expect(page2.status).toBe(200);
    expect(page2.body.total).toBe(20);
    expect(page2.body.data).toHaveLength(8);
    expect(page2.body.page).toBe(2);
  });
});
