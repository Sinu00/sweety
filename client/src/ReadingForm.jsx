import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import Icon from './components/Icon';
import {
  SLOTS, RANGE_LABELS, addDays, classify, friendlyDate, slotLabel, todayString,
} from './slots';

const MIN_VALUE = 40;
const MAX_VALUE = 600;

// Mirrors the API's validation order and messages (server/src/validate.js) so
// mistakes are caught instantly. The API still validates every request.
export function validate({ date, slot, value }, takenSlots, today = todayString()) {
  if (value === '' || value === null || value === undefined) return 'Please enter a glucose value.';
  const num = Number(value);
  if (!Number.isInteger(num) || num < MIN_VALUE || num > MAX_VALUE) {
    return 'Value must be between 40 and 600 mg/dl.';
  }
  if (!date) return 'Please enter a valid date.';
  if (date > today) return 'Date cannot be in the future.';
  if (takenSlots.includes(slot)) {
    const label = slotLabel(slot);
    return `You already have ${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label} reading for this date.`;
  }
  if (takenSlots.length >= 4) return 'You can add only 4 readings per day.';
  return '';
}

// Add / edit one reading. `editing` is the reading row or null.
export default function ReadingForm({ editing, initialDate, initialSlot, onSaved, onDeleted }) {
  const today = todayString();
  const [date, setDate] = useState(editing?.date.slice(0, 10) || initialDate || today);
  const [slot, setSlot] = useState(editing?.slot || initialSlot || 'morning_fasting');
  const [value, setValue] = useState(editing ? String(editing.value) : '');
  const [dayReadings, setDayReadings] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const slotTouched = useRef(false);

  // Load the chosen day's readings so taken slots can be shown up front.
  useEffect(() => {
    let cancelled = false;
    if (!date) return undefined;
    api(`/readings?date=${date}`)
      .then((res) => {
        if (cancelled) return;
        const others = (res?.data || []).filter((r) => r.id !== editing?.id);
        setDayReadings(others);
        // When adding, jump to the first free slot of the chosen day.
        if (!editing && !initialSlot && !slotTouched.current) {
          const free = SLOTS.find((s) => !others.some((r) => r.slot === s.key));
          if (free) setSlot(free.key);
        }
      })
      .catch(() => !cancelled && setDayReadings([]));
    return () => { cancelled = true; };
  }, [date, editing, initialSlot]);

  const takenSlots = dayReadings.map((r) => r.slot);
  const dayIsFull = !editing && takenSlots.length >= 4;
  const num = Number(value);
  const preview = value !== '' && Number.isInteger(num) && num >= MIN_VALUE && num <= MAX_VALUE
    ? classify(num)
    : null;

  async function submit(e) {
    e.preventDefault();
    const problem = validate({ date, slot, value }, takenSlots, today);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const body = { date, slot, value: Number(value) };
      const saved = editing
        ? await api(`/readings/${editing.id}`, { method: 'PUT', body })
        : await api('/readings', { method: 'POST', body });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/readings/${editing.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="reading-form" onSubmit={submit} noValidate>
      {dayIsFull && (
        <div className="notice notice-info">
          <Icon name="info" size={18} />
          <span>You can add only 4 readings per day. Tap a reading on the home screen to edit it.</span>
        </div>
      )}

      <div className="field">
        <div className="field-row">
          <label htmlFor="reading-date" className="field-label">Date</label>
          <div className="chip-row compact">
            {[today, addDays(today, -1)].map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${date === d ? 'is-active' : ''}`}
                onClick={() => setDate(d)}
              >
                {friendlyDate(d)}
              </button>
            ))}
          </div>
        </div>
        <input
          id="reading-date"
          type="date"
          className="input"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <fieldset className="field">
        <legend className="field-label">Time slot</legend>
        <div className="slot-picker">
          {SLOTS.map((s) => {
            const taken = dayReadings.find((r) => r.slot === s.key);
            return (
              <label key={s.key} className={`slot-option ${slot === s.key ? 'is-active' : ''} ${taken ? 'is-taken' : ''}`}>
                <input
                  type="radio"
                  name="slot"
                  value={s.key}
                  checked={slot === s.key}
                  onChange={() => { slotTouched.current = true; setSlot(s.key); setError(''); }}
                />
                <Icon name={s.icon} size={20} />
                <span className="slot-option-label">{s.label}</span>
                {taken && <span className="slot-option-meta">Logged · {taken.value}</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="field value-field">
        <label htmlFor="reading-value" className="field-label">Glucose value</label>
        <div className={`value-input ${preview ? `is-${preview}` : ''}`}>
          <input
            id="reading-value"
            type="number"
            inputMode="numeric"
            min={MIN_VALUE}
            max={MAX_VALUE}
            step={1}
            placeholder="110"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            aria-describedby="value-hint"
            data-autofocus={editing ? undefined : true}
          />
          <span className="value-unit">mg/dl</span>
        </div>
        <p id="value-hint" className="value-hint">
          {preview
            ? <span className={`pill pill-${preview}`}>{RANGE_LABELS[preview]}</span>
            : 'Whole number between 40 and 600'}
        </p>
      </div>

      {error && (
        <div className="notice notice-error" role="alert">
          <Icon name="info" size={18} />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Saving…' : editing ? 'Save changes' : 'Add reading'}
      </button>

      {editing && !confirmDelete && (
        <button type="button" className="btn btn-ghost btn-block danger-text" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={18} /> Delete reading
        </button>
      )}
      {editing && confirmDelete && (
        <div className="confirm-row">
          <span>Delete this reading?</span>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Keep</button>
          <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>Delete</button>
        </div>
      )}
    </form>
  );
}
