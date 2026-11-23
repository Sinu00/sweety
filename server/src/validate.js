const { SLOT_KEYS, SLOT_LABELS } = require('./constants');

const MIN_VALUE = 40;
const MAX_VALUE = 600;

// Validates a reading payload. Returns { error } or { reading }.
// existingSlots: slot keys already used on that date by this user
// (excluding the reading being edited).
function validateReading({ date, slot, value }, existingSlots, today) {
  if (value === undefined || value === null || value === '') {
    return { error: 'Please enter a glucose value.' };
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < MIN_VALUE || num > MAX_VALUE) {
    return { error: 'Value must be between 40 and 600 mg/dl.' };
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return { error: 'Please enter a valid date.' };
  }
  if (date > today) {
    return { error: 'Date cannot be in the future.' };
  }
  if (!slot || !SLOT_KEYS.includes(slot)) {
    return { error: 'Please choose a time slot.' };
  }
  if (existingSlots.includes(slot)) {
    return { error: `You already have an ${SLOT_LABELS[slot]} reading for this date.` };
  }
  if (existingSlots.length >= 4) {
    return { error: 'You can add only 4 readings per day.' };
  }
  return { reading: { date, slot, value: num } };
}

// Local today as YYYY-MM-DD (a reading's "date" is a calendar day, not an instant).
function todayString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { validateReading, todayString, MIN_VALUE, MAX_VALUE };
