const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { addDays, buildInsights } = require('../glucose');
const { todayString } = require('../validate');
const { SLOT_LABELS } = require('../constants');

const router = express.Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// The AI summary is optional: it is only offered when an API key is configured.
const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

async function insightsFor(userId, date) {
  // 60 days back is plenty for the 14-day window plus a long streak.
  const { rows } = await db.query(
    'SELECT date, slot, value FROM readings WHERE user_id = $1 AND date BETWEEN $2 AND $3',
    [userId, addDays(date, -59), date]
  );
  return buildInsights(rows, date);
}

function dateParam(req) {
  const date = req.query.date || todayString();
  return DATE_RE.test(date) && !Number.isNaN(Date.parse(date)) ? date : null;
}

// GET /api/insights?date=YYYY-MM-DD  (defaults to today)
router.get('/', async (req, res) => {
  const date = dateParam(req);
  if (!date) return res.status(400).json({ error: 'Please pass a date as ?date=YYYY-MM-DD.' });
  res.json({ ...(await insightsFor(req.userId, date)), aiAvailable: aiEnabled() });
});

const SYSTEM_PROMPT = `You write a short, warm weekly check-in for a person who logs their blood glucose in an app called Sweety.
You receive their aggregated numbers for the last 14 days as JSON. Units are mg/dl. "In range" means 70-180 mg/dl.
Write 3 or 4 plain sentences, under 90 words, second person, no headings or lists.
Mention one thing going well and one pattern worth watching, using their actual numbers.
Do not diagnose, do not suggest medication or dose changes, and do not invent numbers that are not in the data.
If something looks concerning (frequent lows or many highs), suggest they discuss it with their doctor.`;

// POST /api/insights/summary { date? }  -> { text }
// Sends only aggregated statistics (no name, email or raw log) to Claude.
router.post('/summary', async (req, res) => {
  if (!aiEnabled()) {
    return res.status(503).json({ error: 'AI summaries are not set up on this server.' });
  }
  const date = req.body?.date && DATE_RE.test(req.body.date) ? req.body.date : todayString();
  const insights = await insightsFor(req.userId, date);
  if (insights.count === 0) {
    return res.status(400).json({ error: 'Log a few readings first, then ask for a summary.' });
  }
  const { tips, ...stats } = insights;
  const slotAverages = Object.fromEntries(
    Object.entries(stats.slotAverages).map(([k, v]) => [SLOT_LABELS[k], v])
  );

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify({ ...stats, slotAverages }) }],
    });
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (response.stop_reason === 'refusal' || !text) {
      return res.status(502).json({ error: 'Could not write a summary right now. Please try again later.' });
    }
    res.json({ text });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`Claude API error ${err.status}:`, err.message);
      return res.status(502).json({ error: 'Could not write a summary right now. Please try again later.' });
    }
    throw err;
  }
});

module.exports = router;
