import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../api';
import { formatDate, formatRange, slotLabel, todayString } from '../slots';

function StatCard({ title, rangeText, stats, children }) {
  return (
    <div className="card report-card">
      <h2>{title}</h2>
      <p className="muted">{rangeText}</p>
      {!stats || stats.count === 0 ? (
        <p className="empty-state">No readings in this period yet.</p>
      ) : (
        <>
          <div className="stats-grid">
            <div><span className="stat-label">Highest</span><strong>{stats.highest}</strong></div>
            <div><span className="stat-label">Lowest</span><strong>{stats.lowest}</strong></div>
            <div><span className="stat-label">Average</span><strong>{stats.average}</strong></div>
            <div><span className="stat-label">Readings</span><strong>{stats.count}</strong></div>
          </div>
          {children}
        </>
      )}
    </div>
  );
}

export default function Reports() {
  const [date, setDate] = useState(todayString());
  const [daily, setDaily] = useState(null);
  const [mtd, setMtd] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [d, m, prev] = await Promise.all([
          api(`/reports/daily?date=${date}`),
          api(`/reports/month-to-date?date=${date}`),
          api(`/reports/monthly?date=${date}`),
        ]);
        const [y, m] = date.split('-').map(Number);
        const lastDay = String(new Date(y, m, 0).getDate()).padStart(2, '0');
        const month = date.slice(0, 7);
        const { data: monthReadings } = await api(`/readings?from=${month}-01&to=${month}-${lastDay}`);
        if (cancelled) return;
        setDaily(d);
        setMtd(m);
        setMonthly(prev);
        setChartData(
          [...monthReadings]
            .sort((a, b) => (a.date < b.date ? -1 : 1))
            .map((r) => ({ day: r.date.slice(0, 10), value: r.value, slot: slotLabel(r.slot) }))
        );
        setError('');
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [date]);

  return (
    <div className="page">
      <h1>Reports</h1>
      <label className="date-picker">
        Selected date
        <input type="date" value={date} max={todayString()} onChange={(e) => setDate(e.target.value)} />
      </label>
      {error && <div className="error-box" role="alert">{error}</div>}
      <StatCard title="Daily" rangeText={daily ? formatRange(daily.range) : ''} stats={daily}>
        {daily && daily.readings.length > 0 && (
          <table>
            <thead><tr><th>Slot</th><th>Value (mg/dl)</th></tr></thead>
            <tbody>
              {daily.readings.map((r) => (
                <tr key={r.id}><td>{slotLabel(r.slot)}</td><td><strong>{r.value}</strong></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </StatCard>
      <StatCard title="Month-to-date" rangeText={mtd ? formatRange(mtd.range) : ''} stats={mtd} />
      <StatCard title="Previous month" rangeText={monthly ? formatRange(monthly.range) : ''} stats={monthly} />
      <div className="card">
        <h2>Readings this month</h2>
        {chartData.length === 0 ? (
          <p className="empty-state">No readings this month yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={(d) => formatDate(d).slice(0, 6)} />
              <YAxis domain={[0, 'dataMax + 40']} />
              <Tooltip
                formatter={(v, name, props) => [`${v} mg/dl`, props.payload.slot]}
                labelFormatter={(d) => formatDate(d)}
              />
              <Line type="monotone" dataKey="value" stroke="#d6336c" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
