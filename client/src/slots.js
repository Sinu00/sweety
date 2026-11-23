// The four reading time slots, in display order (must match the API).
export const SLOTS = [
  { key: 'morning_fasting', label: 'Morning (fasting)' },
  { key: 'after_breakfast', label: 'After breakfast' },
  { key: 'after_lunch', label: 'After lunch' },
  { key: 'after_dinner', label: 'After dinner' },
];

export function slotLabel(key) {
  return SLOTS.find((s) => s.key === key)?.label || key;
}

// Local today as YYYY-MM-DD, for date input defaults and max attributes.
export function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// "2026-10-15" -> "15 Oct 2026" without timezone surprises.
export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

export function formatRange(range) {
  return range.from === range.to
    ? formatDate(range.from)
    : `${formatDate(range.from)} - ${formatDate(range.to)}`;
}
