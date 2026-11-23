const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validateReading, todayString } = require('../validate');

const router = express.Router();
router.use(requireAuth);

// Slot keys already used by this user on a date, optionally ignoring one reading.
async function slotsTaken(userId, date, excludeId = null) {
  const { rows } = await db.query(
    `SELECT slot FROM readings
     WHERE user_id = $1 AND date = $2 AND ($3::int IS NULL OR id <> $3)`,
    [userId, date, excludeId]
  );
  return rows.map((r) => r.slot);
}

// GET /api/readings?date=&from=&to=&page=&limit=
router.get('/', async (req, res) => {
  const { date, from, to } = req.query;
  const where = ['user_id = $1'];
  const params = [req.userId];
  if (date) {
    params.push(date);
    where.push(`date = $${params.length}`);
  } else {
    if (from) {
      params.push(from);
      where.push(`date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`date <= $${params.length}`);
    }
  }
  const base = `FROM readings WHERE ${where.join(' AND ')}`;
  const order = `ORDER BY date DESC,
    CASE slot WHEN 'morning_fasting' THEN 1 WHEN 'after_breakfast' THEN 2
              WHEN 'after_lunch' THEN 3 ELSE 4 END`;

  // Optional pagination (bonus): ?page=1&limit=20
  if (req.query.page || req.query.limit) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { rows: countRows } = await db.query(`SELECT COUNT(*)::int AS total ${base}`, params);
    params.push(limit, (page - 1) * limit);
    const { rows } = await db.query(
      `SELECT id, date, slot, value ${base} ${order} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return res.json({ data: rows, page, limit, total: countRows[0].total });
  }

  const { rows } = await db.query(`SELECT id, date, slot, value ${base} ${order}`, params);
  res.json({ data: rows });
});

// POST /api/readings { date, slot, value }
router.post('/', async (req, res) => {
  const { date, slot, value } = req.body || {};
  const taken = date ? await slotsTaken(req.userId, date) : [];
  const { error, reading } = validateReading({ date, slot, value }, taken, todayString());
  if (error) return res.status(400).json({ error });
  try {
    const { rows } = await db.query(
      'INSERT INTO readings (user_id, date, slot, value) VALUES ($1, $2, $3, $4) RETURNING id, date, slot, value',
      [req.userId, reading.date, reading.slot, reading.value]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'You already have a reading for this slot and date.' });
    }
    throw err;
  }
});

// PUT /api/readings/:id { date?, slot?, value? }
router.put('/:id', async (req, res) => {
  const { rows: existing } = await db.query(
    'SELECT id, date, slot, value FROM readings WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!existing[0]) return res.status(404).json({ error: 'Reading not found.' });
  const current = existing[0];
  const currentDate = current.date.toISOString().slice(0, 10);

  const date = req.body.date !== undefined ? req.body.date : currentDate;
  const slot = req.body.slot !== undefined ? req.body.slot : current.slot;
  const value = req.body.value !== undefined ? req.body.value : current.value;

  const taken = date ? await slotsTaken(req.userId, date, current.id) : [];
  const { error, reading } = validateReading({ date, slot, value }, taken, todayString());
  if (error) return res.status(400).json({ error });
  try {
    const { rows } = await db.query(
      `UPDATE readings SET date = $1, slot = $2, value = $3, updated_at = now()
       WHERE id = $4 AND user_id = $5 RETURNING id, date, slot, value`,
      [reading.date, reading.slot, reading.value, current.id, req.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'You already have a reading for this slot and date.' });
    }
    throw err;
  }
});

// DELETE /api/readings/:id
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(
    'DELETE FROM readings WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Reading not found.' });
  res.status(204).end();
});

module.exports = router;
