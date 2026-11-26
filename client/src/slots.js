// Time slots, glucose ranges and date helpers shared across the app.

// The four reading time slots, in display order (must match the API).
export const SLOTS = [
  { key: 'morning_fasting', label: 'Morning (fasting)', short: 'Fasting', icon: 'sunrise' },
  { key: 'after_breakfast', label: 'After breakfast', short: 'Breakfast', icon: 'coffee' },
  { key: 'after_lunch', label: 'After lunch', short: 'Lunch', icon: 'sun' },
  { key: 'after_dinner', label: 'After dinner', short: 'Dinner', icon: 'moon' },
];

export function slotInfo(key) {
  return SLOTS.find((s) => s.key === key) || { key, label: key, short: key, icon: 'drop' };
}

export function slotLabel(key) {
  return slotInfo(key).label;
}

// Same thresholds as the API (server/src/glucose.js): the 70-180 mg/dl
// "time in range" target.
export const LOW_BELOW = 70;
export const HIGH_ABOVE = 180;

export const RANGE_LABELS = { low: 'Low', in_range: 'In range', high: 'High' };

export function classify(value) {
  if (value < LOW_BELOW) return 'low';
  if (value > HIGH_ABOVE) return 'high';
  return 'in_range';
}

// --- dates: always 'YYYY-MM-DD' strings, never Date objects in UTC ---

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parse(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Local today as YYYY-MM-DD, for defaults and the "no future dates" rule.
export function todayString() {
  return toDateString(new Date());
}

export function addDays(dateStr, n) {
  const d = parse(dateStr);
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

export function weekday(dateStr) {
  return WEEKDAYS[parse(dateStr).getDay()];
}

export function dayOfMonth(dateStr) {
  return Number(dateStr.slice(8, 10));
}

export function lastDayOfMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// "2026-10-15" -> "15 Oct 2026"
export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// "2026-10-15" -> "Thu, 15 Oct" (or "Today" / "Yesterday")
export function friendlyDate(dateStr) {
  const today = todayString();
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, -1)) return 'Yesterday';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${weekday(dateStr)}, ${d} ${MONTHS[m - 1]}`;
}

export function monthName(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// { from, to } -> "1 Oct - 15 Oct 2026"
export function formatRange(range) {
  if (range.from === range.to) return formatDate(range.from);
  const [fy, fm, fd] = range.from.split('-').map(Number);
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  const start = sameYear ? `${fd} ${MONTHS[fm - 1]}` : formatDate(range.from);
  return `${start} – ${formatDate(range.to)}`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
