require('./setup');
const { request, app, db, resetDb, registerUser, auth } = require('./helpers');

beforeAll(resetDb);
afterAll(() => db.pool.end());

describe('auth', () => {
  test('registers a user and returns a token', async () => {
    const { res, token, user } = await registerUser({ email: 'a@example.com' });
    expect(res.status).toBe(201);
    expect(token).toBeTruthy();
    expect(user.email).toBe('a@example.com');
    expect(user.password_hash).toBeUndefined();
  });

  test('stores the password hashed, never plain text', async () => {
    await registerUser({ email: 'hash@example.com', password: 'secret123' });
    const { rows } = await db.query('SELECT password_hash FROM users WHERE email = $1', ['hash@example.com']);
    expect(rows[0].password_hash).not.toBe('secret123');
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  test('rejects a duplicate email', async () => {
    await registerUser({ email: 'dup@example.com' });
    const { res } = await registerUser({ email: 'dup@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/);
  });

  test('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'X', email: 'x@example.com', password: '123' });
    expect(res.status).toBe(400);
  });

  test('logs in with correct credentials and rejects wrong ones', async () => {
    await registerUser({ email: 'login@example.com', password: 'secret123' });
    const ok = await request(app).post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'secret123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const bad = await request(app).post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrong' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('Invalid email or password.');
  });

  test('/api/auth/me returns the logged-in user', async () => {
    const { token, user } = await registerUser();
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  test('rejects requests without a token', async () => {
    const res = await request(app).get('/api/readings');
    expect(res.status).toBe(401);
  });
});
