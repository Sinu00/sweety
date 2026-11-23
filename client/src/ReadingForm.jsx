import { useEffect, useState } from 'react';
import { api } from './api';
import { SLOTS, todayString } from './slots';

// Add / edit form for one reading. `editing` is the reading row or null.
export default function ReadingForm({ editing, onSaved, onCancel }) {
  const [date, setDate] = useState(todayString());
  const [slot, setSlot] = useState('morning_fasting');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setDate(editing.date.slice(0, 10));
      setSlot(editing.slot);
      setValue(String(editing.value));
    } else {
      setDate(todayString());
      setSlot('morning_fasting');
      setValue('');
    }
    setError('');
  }, [editing]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editing) {
        await api(`/readings/${editing.id}`, { method: 'PUT', body: { date, slot, value: Number(value) } });
      } else {
        await api('/readings', { method: 'POST', body: { date, slot, value: Number(value) } });
      }
      setValue('');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card reading-form" onSubmit={submit}>
      <h2>{editing ? 'Edit reading' : 'Add a reading'}</h2>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="form-row">
        <label>
          Date
          <input type="date" value={date} max={todayString()}
            onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Time slot
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            {SLOTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>
        <label>
          Value (mg/dl)
          <input type="number" min={40} max={600} step={1} value={value}
            onChange={(e) => setValue(e.target.value)} placeholder="e.g. 110" required />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : editing ? 'Save changes' : 'Add reading'}
        </button>
        {editing && (
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}
