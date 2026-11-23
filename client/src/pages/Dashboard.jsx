import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { formatDate, slotLabel, todayString } from '../slots';
import ReadingForm from '../ReadingForm';

const PAGE_SIZE = 10;

export default function Dashboard() {
  const [readings, setReadings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (p = page) => {
    try {
      const res = await api(`/readings?page=${p}&limit=${PAGE_SIZE}`);
      setReadings(res.data);
      setTotal(res.total);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [page]);

  useEffect(() => { load(page); }, [load, page]);

  async function remove(id) {
    if (!window.confirm('Delete this reading?')) return;
    try {
      await api(`/readings/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const todayCount = readings.filter((r) => r.date.slice(0, 10) === todayString()).length;

  return (
    <div className="page">
      <h1>My readings</h1>
      <p className="muted">
        Record up to 4 readings a day: Morning (fasting), After breakfast, After lunch, After dinner.
        {todayCount > 0 && ` You have ${todayCount} of 4 for today.`}
      </p>
      <ReadingForm editing={editing} onSaved={() => { setEditing(null); load(); }}
        onCancel={() => setEditing(null)} />
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="card">
        <h2>History</h2>
        {readings.length === 0 ? (
          <p className="empty-state">No readings yet. Add your first reading above.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Date</th><th>Slot</th><th>Value (mg/dl)</th><th></th></tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.date.slice(0, 10))}</td>
                  <td>{slotLabel(r.slot)}</td>
                  <td><strong>{r.value}</strong></td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => setEditing(r)}>Edit</button>
                    <button className="link-btn danger" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
