// The four reading time slots, in display order.
const SLOTS = [
  { key: 'morning_fasting', label: 'Morning (fasting)' },
  { key: 'after_breakfast', label: 'After breakfast' },
  { key: 'after_lunch', label: 'After lunch' },
  { key: 'after_dinner', label: 'After dinner' },
];

const SLOT_KEYS = SLOTS.map((s) => s.key);
const SLOT_LABELS = Object.fromEntries(SLOTS.map((s) => [s.key, s.label]));

module.exports = { SLOTS, SLOT_KEYS, SLOT_LABELS };
