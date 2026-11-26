import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../AppContext';
import Icon from '../components/Icon';
import { SLOTS, classify, friendlyDate, slotInfo } from '../slots';

const PAGE_SIZE = 20;
const SLOT_ORDER = Object.fromEntries(SLOTS.map((s, i) => [s.key, i]));

// Groups a flat, date-descending list into [{ date, readings }].
function groupByDate(readings) {
  const groups = [];
  readings.forEach((r) => {
    const last = groups[groups.length - 1];
    if (last && last.date === r.date) last.readings.push(r);
    else groups.push({ date: r.date, readings: [r] });
  });
  groups.forEach((g) => g.readings.sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]));
  return groups;
}

export default function History() {
  const { openReading, dataVersion } = useApp();
  const [readings, setReadings] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Uses the paginated API (?page=&limit=). After an edit we reload every page
  // already shown so the list doesn't jump.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const pages = Array.from({ length: page }, (_, i) => api(`/readings?page=${i + 1}&limit=${PAGE_SIZE}`));
    Promise.all(pages)
      .then((results) => {
        if (cancelled) return;
        setReadings(results.flatMap((res) => res.data));
        setTotal(results[results.length - 1].total);
        setError('');
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [page, dataVersion]);

  const groups = groupByDate(readings);
  const hasMore = total !== null && readings.length < total;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{total === null ? ' ' : `${total} reading${total === 1 ? '' : 's'}`}</p>
          <h1>History</h1>
        </div>
      </header>

      {error && <div className="notice notice-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}

      {total === 0 && (
        <div className="empty">
          <span className="empty-icon"><Icon name="drop" size={28} /></span>
          <h2>No readings yet</h2>
          <p>Your log will appear here, grouped by day.</p>
          <button type="button" className="btn btn-primary" onClick={() => openReading({})}>Add your first reading</button>
        </div>
      )}

      <div className="history">
        {groups.map((g) => {
          const avg = Math.round(g.readings.reduce((a, r) => a + r.value, 0) / g.readings.length);
          return (
            <section key={g.date} className="day-group" aria-label={friendlyDate(g.date)}>
              <div className="day-group-head">
                <h2>{friendlyDate(g.date)}</h2>
                <span className="muted small">{g.readings.length}/4 · avg {avg}</span>
              </div>
              <ul className="card list-card">
                {g.readings.map((r) => {
                  const s = slotInfo(r.slot);
                  const range = classify(r.value);
                  return (
                    <li key={r.id}>
                      <button type="button" className="list-row" onClick={() => openReading({ editing: r })}>
                        <span className={`slot-icon small is-${range}`}><Icon name={s.icon} size={18} /></span>
                        <span className="list-row-label">{s.label}</span>
                        <span className={`list-row-value is-${range}`}>{r.value}</span>
                        <span className="list-row-unit">mg/dl</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {hasMore && (
        <button type="button" className="btn btn-ghost btn-block" disabled={loading} onClick={() => setPage(page + 1)}>
          {loading ? 'Loading…' : 'Show older readings'}
        </button>
      )}
    </div>
  );
}
