// Unit tests for the pure range / insights logic (no database needed).
const { classify, addDays, streakEndingOn, buildInsights } = require('../src/glucose');

test('classify uses the 70-180 mg/dl target range (edges are in range)', () => {
  expect(classify(69)).toBe('low');
  expect(classify(70)).toBe('in_range');
  expect(classify(180)).toBe('in_range');
  expect(classify(181)).toBe('high');
});

test('addDays crosses month and year boundaries', () => {
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
});

describe('streakEndingOn', () => {
  const dates = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-10'];

  test('counts consecutive logged days back from yesterday when today is empty', () => {
    expect(streakEndingOn(dates, '2026-10-15')).toBe(3);
  });

  test('includes the selected day when it has a reading', () => {
    expect(streakEndingOn([...dates, '2026-10-15'], '2026-10-15')).toBe(4);
  });

  test('is zero after a missed day', () => {
    expect(streakEndingOn(dates, '2026-10-17')).toBe(0);
  });
});

describe('buildInsights', () => {
  test('summarises the last 14 days and ignores older readings', () => {
    const readings = [
      { date: '2026-10-15', slot: 'morning_fasting', value: 65 }, // low
      { date: '2026-10-15', slot: 'after_lunch', value: 150 },
      { date: '2026-10-14', slot: 'after_dinner', value: 200 }, // high
      { date: '2026-10-05', slot: 'after_breakfast', value: 120 },
      { date: '2026-09-01', slot: 'after_dinner', value: 500 }, // outside window
    ];
    const s = buildInsights(readings, '2026-10-15');
    expect(s.range).toEqual({ from: '2026-10-02', to: '2026-10-15' });
    expect(s.count).toBe(4);
    expect(s.ranges).toEqual({ low: 1, in_range: 2, high: 1 });
    expect(s.inRangePct).toBe(50);
    expect(s.average).toBe(133.8);
    expect(s.streak).toBe(2);
    expect(s.slotAverages.after_dinner).toBe(200);
    expect(s.tips.some((t) => t.tone === 'warn' && t.text.includes('1 low reading'))).toBe(true);
  });

  test('compares this week with the week before', () => {
    const readings = [
      { date: '2026-10-15', slot: 'morning_fasting', value: 100 },
      { date: '2026-10-05', slot: 'morning_fasting', value: 140 },
    ];
    const s = buildInsights(readings, '2026-10-15');
    expect(s.weekTrend).toEqual({ thisWeek: 100, lastWeek: 140, change: -40 });
    expect(s.tips.some((t) => t.text.includes('down 40 mg/dl'))).toBe(true);
  });

  test('gives a friendly prompt when there is no data', () => {
    const s = buildInsights([], '2026-10-15');
    expect(s.count).toBe(0);
    expect(s.average).toBeNull();
    expect(s.tips).toHaveLength(1);
  });
});
