// Glucose ranges and the rule-based insights shown on the home screen.
// Pure functions (no database), so they are easy to unit test.
const { SLOT_KEYS, SLOT_LABELS } = require('./constants');

// "Time in range" target used by the International Consensus on TIR (2019):
// below 70 mg/dl is low, above 180 mg/dl is high.
const LOW_BELOW = 70;
const HIGH_ABOVE = 180;

function classify(value) {
  if (value < LOW_BELOW) return 'low';
  if (value > HIGH_ABOVE) return 'high';
  return 'in_range';
}

// 'YYYY-MM-DD' +/- n days, done in UTC so it never shifts with the server timezone.
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const round1 = (n) => Math.round(n * 10) / 10;
const avg = (values) => (values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null);

// Consecutive days with at least one reading, ending on `date`. If `date`
// itself has no reading yet the streak is still alive from the day before.
function streakEndingOn(datesWithReadings, date) {
  const days = new Set(datesWithReadings);
  let cursor = days.has(date) ? date : addDays(date, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// readings: [{ date, slot, value }] for this user, covering at least the
// 14 days up to `date` (more is fine, it is filtered here).
function buildInsights(readings, date, windowDays = 14) {
  const from = addDays(date, -(windowDays - 1));
  const inWindow = readings.filter((r) => r.date >= from && r.date <= date);
  const values = inWindow.map((r) => r.value);

  const ranges = { low: 0, in_range: 0, high: 0 };
  values.forEach((v) => ranges[classify(v)]++);

  const perDay = {};
  inWindow.forEach((r) => { perDay[r.date] = (perDay[r.date] || 0) + 1; });

  const slotAverages = Object.fromEntries(
    SLOT_KEYS.map((slot) => [slot, avg(inWindow.filter((r) => r.slot === slot).map((r) => r.value))])
  );

  const midpoint = addDays(date, -6);
  const thisWeek = avg(inWindow.filter((r) => r.date >= midpoint).map((r) => r.value));
  const lastWeek = avg(inWindow.filter((r) => r.date < midpoint && r.date >= addDays(date, -13)).map((r) => r.value));

  const summary = {
    range: { from, to: date },
    count: values.length,
    average: avg(values),
    ranges,
    inRangePct: values.length ? Math.round((ranges.in_range / values.length) * 100) : null,
    daysLogged: Object.keys(perDay).length,
    fullDays: Object.values(perDay).filter((n) => n >= 4).length,
    streak: streakEndingOn(readings.map((r) => r.date), date),
    slotAverages,
    weekTrend: thisWeek !== null && lastWeek !== null
      ? { thisWeek, lastWeek, change: round1(thisWeek - lastWeek) }
      : null,
  };
  return { ...summary, tips: tipsFor(summary, windowDays) };
}

// Short, plain-language observations. Deliberately descriptive, not medical advice.
function tipsFor(s, windowDays) {
  if (s.count === 0) {
    return [{ tone: 'info', text: 'Log a few readings and your insights will show up here.' }];
  }
  const tips = [];
  if (s.ranges.low > 0) {
    tips.push({
      tone: 'warn',
      text: `${s.ranges.low} low reading${s.ranges.low > 1 ? 's' : ''} (below ${LOW_BELOW}) in the last ${windowDays} days.`,
    });
  }
  if (s.inRangePct >= 70) {
    tips.push({ tone: 'good', text: `${s.inRangePct}% of readings in range. The common target is 70% or more.` });
  } else {
    tips.push({ tone: 'warn', text: `${s.inRangePct}% of readings in range. The common target is 70% or more.` });
  }
  const [topSlot, topAvg] = Object.entries(s.slotAverages)
    .filter(([, v]) => v !== null)
    .sort((a, b) => b[1] - a[1])[0];
  tips.push({
    tone: topAvg > HIGH_ABOVE ? 'warn' : 'info',
    text: `${SLOT_LABELS[topSlot]} is your highest slot, averaging ${topAvg} mg/dl.`,
  });
  if (s.weekTrend && Math.abs(s.weekTrend.change) >= 5) {
    const down = s.weekTrend.change < 0;
    tips.push({
      tone: down ? 'good' : 'warn',
      text: `Your average is ${down ? 'down' : 'up'} ${Math.abs(s.weekTrend.change)} mg/dl compared with the week before.`,
    });
  }
  return tips;
}

module.exports = { LOW_BELOW, HIGH_ABOVE, classify, addDays, streakEndingOn, buildInsights };
