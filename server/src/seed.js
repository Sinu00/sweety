// Seeds a demo user with realistic readings for the last ~60 days.
// Usage: npm run seed   (uses DATABASE_URL from .env)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const { SLOT_KEYS } = require('./constants');

const DEMO_EMAIL = 'demo@sweety.app';
const DEMO_PASSWORD = 'demo1234';

// Deterministic pseudo-random so repeated seeds look the same.
function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function dateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['Demo User', DEMO_EMAIL, hash]
  );
  const userId = rows[0].id;
  await db.query('DELETE FROM readings WHERE user_id = $1', [userId]);

  const rng = makeRng(42);
  // Typical per-slot baselines; fasting lower, post-meal higher.
  const baselines = { morning_fasting: 95, after_breakfast: 140, after_lunch: 135, after_dinner: 150 };
  let inserted = 0;
  for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
    for (const slot of SLOT_KEYS) {
      // Skip some readings so days have 2-4 entries and look real.
      if (rng() < 0.25) continue;
      const spread = slot === 'morning_fasting' ? 20 : 45;
      const value = Math.round(baselines[slot] + (rng() - 0.5) * 2 * spread);
      const clamped = Math.min(600, Math.max(40, value));
      await db.query(
        'INSERT INTO readings (user_id, date, slot, value) VALUES ($1, $2, $3, $4)',
        [userId, dateString(daysAgo), slot, clamped]
      );
      inserted++;
    }
  }
  console.log(`Seeded user ${DEMO_EMAIL} (password: ${DEMO_PASSWORD}) with ${inserted} readings.`);
  await db.pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
