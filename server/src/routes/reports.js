const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { LOW_BELOW, HIGH_ABOVE } = require('../glucose');

const router = express.Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(req, res) {
  const date = req.query.date;
  if (!date || !DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    res.status(400).json({ error: 'Please pass a date as ?date=YYYY-MM-DD.' });
    return null;
  }
  return date;
}

async function statsFor(userId, from, to) {
  const { rows } = await db.query(
    `SELECT MAX(value) AS highest, MIN(value) AS lowest,
            ROUND(AVG(value)::numeric, 1) AS average, COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE value < $4)::int AS low,
            COUNT(*) FILTER (WHERE value > $5)::int AS high
     FROM readings WHERE user_id = $1 AND date BETWEEN $2 AND $3`,
    [userId, from, to, LOW_BELOW, HIGH_ABOVE]
  );
  const row = rows[0];
  return {
    range: { from, to },
    highest: row.highest,
    lowest: row.lowest,
    average: row.average === null ? null : Number(row.average),
    count: row.count,
    // Extra (beyond the brief): how many readings were low / in range / high.
    ranges: { low: row.low, in_range: row.count - row.low - row.high, high: row.high },
  };
}

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', async (req, res) => {
  const date = parseDateParam(req, res);
  if (!date) return;
  const stats = await statsFor(req.userId, date, date);
  const { rows: readings } = await db.query(
    `SELECT id, date, slot, value FROM readings
     WHERE user_id = $1 AND date = $2
     ORDER BY CASE slot WHEN 'morning_fasting' THEN 1 WHEN 'after_breakfast' THEN 2
                        WHEN 'after_lunch' THEN 3 ELSE 4 END`,
    [req.userId, date]
  );
  res.json({ ...stats, readings });
});

// GET /api/reports/month-to-date?date=YYYY-MM-DD
router.get('/month-to-date', async (req, res) => {
  const date = parseDateParam(req, res);
  if (!date) return;
  const from = `${date.slice(0, 7)}-01`;
  res.json(await statsFor(req.userId, from, date));
});

// GET /api/reports/monthly?date=YYYY-MM-DD  (the whole previous month)
router.get('/monthly', async (req, res) => {
  const date = parseDateParam(req, res);
  if (!date) return;
  const [y, m] = date.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1)); // first day of previous month
  const from = prev.toISOString().slice(0, 10);
  const last = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0));
  const to = last.toISOString().slice(0, 10);
  res.json(await statsFor(req.userId, from, to));
});

module.exports = router;
