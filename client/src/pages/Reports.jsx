import { useEffect, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '../api';
import { useApp } from '../AppContext';
import Icon from '../components/Icon';
import RangeBar from '../components/RangeBar';
import {
  HIGH_ABOVE, LOW_BELOW, RANGE_LABELS, SLOTS, classify, formatDate, formatRange, lastDayOfMonth,
  monthName, slotInfo, todayString,
} from '../slots';

const REPORTS = [
  { key: 'daily', label: 'Day', title: 'Daily report' },
  { key: 'month-to-date', label: 'Month to date', title: 'Month to date' },
  { key: 'monthly', label: 'Last month', title: 'Previous month' },
];
const SLOT_INDEX = Object.fromEntries(SLOTS.map((s, i) => [s.key, i]));

function ReportCard({ report, data }) {
  if (!data) return <div className="card report-card skeleton" aria-busy="true" />;
  const empty = data.count === 0;
  const avgRange = empty ? null : classify(data.average);

  return (
    <article className="card report-card" aria-labelledby="report-title">
      <header className="report-head">
        <div>
          <h2 id="report-title">{report.title}</h2>
          <p className="muted small"><Icon name="calendar" size={14} /> {formatRange(data.range)}</p>
        </div>
        {!empty && <span className={`pill pill-${avgRange}`}>{RANGE_LABELS[avgRange]}</span>}
      </header>

      {empty ? (
        <div className="empty compact">
          <span className="empty-icon"><Icon name="chart" size={24} /></span>
          <h3>Nothing logged in this period</h3>
          <p>Add a reading and your numbers will show up here.</p>
        </div>
      ) : (
        <>
          <p className="report-average">
            {data.average}<span>mg/dl average</span>
          </p>
          <dl className="stat-grid">
            <div><dt><Icon name="arrowUp" size={14} /> Highest</dt><dd>{data.highest}</dd></div>
            <div><dt><Icon name="arrowDown" size={14} /> Lowest</dt><dd>{data.lowest}</dd></div>
            <div><dt><Icon name="drop" size={14} /> Readings</dt><dd>{data.count}</dd></div>
          </dl>
          {data.ranges && <RangeBar ranges={data.ranges} />}

          {data.readings && (
            <ul className="list-card report-readings">
              {data.readings.map((r) => {
                const s = slotInfo(r.slot);
                const range = classify(r.value);
                return (
                  <li key={r.id} className="list-row static">
                    <span className={`slot-icon small is-${range}`}><Icon name={s.icon} size={18} /></span>
                    <span className="list-row-label">{s.label}</span>
                    <span className={`list-row-value is-${range}`}>{r.value}</span>
                    <span className="list-row-unit">mg/dl</span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </article>
  );
}

function ChartDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={3.5} className={`chart-dot is-${classify(payload.value)}`} />;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{p.value} mg/dl</strong>
      <span>{formatDate(p.date)} · {slotInfo(p.slot).label}</span>
    </div>
  );
}

function MonthChart({ date, readings }) {
  const lastDay = lastDayOfMonth(date);
  // Spread a day's readings across the day so all four are visible.
  const points = readings
    .map((r) => ({ ...r, x: Number(r.date.slice(8, 10)) + SLOT_INDEX[r.slot] * 0.22 }))
    .sort((a, b) => a.x - b.x);
  const yMax = Math.ceil(Math.max(250, ...points.map((p) => p.value)) / 50) * 50;

  return (
    <section className="card chart-card" aria-labelledby="chart-title">
      <header className="report-head">
        <div>
          <h2 id="chart-title">{monthName(date)}</h2>
          <p className="muted small">Every reading this month · shaded band is {LOW_BELOW}–{HIGH_ABOVE} mg/dl</p>
        </div>
      </header>
      {points.length === 0 ? (
        <div className="empty compact">
          <p>No readings this month yet.</p>
        </div>
      ) : (
        <div className="month-chart">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid vertical={false} />
              <ReferenceArea y1={LOW_BELOW} y2={HIGH_ABOVE} ifOverflow="extendDomain" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[1, lastDay + 0.9]}
                ticks={[1, 8, 15, 22, lastDay]}
                tickFormatter={(d) => Math.floor(d)}
                tickLine={false}
                axisLine={false}
              />
              <YAxis domain={[40, yMax]} ticks={[LOW_BELOW, HIGH_ABOVE, yMax]} tickLine={false} axisLine={false} width={48} />
              <Tooltip content={<ChartTooltip />} cursor={false} />
              <Line type="monotone" dataKey="value" dot={<ChartDot />} activeDot={{ r: 6 }} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default function Reports() {
  const { dataVersion } = useApp();
  const today = todayString();
  const [date, setDate] = useState(today);
  const [active, setActive] = useState('daily');
  const [reports, setReports] = useState({});
  const [monthReadings, setMonthReadings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setReports({});
    const month = date.slice(0, 7);
    Promise.all([
      ...REPORTS.map((r) => api(`/reports/${r.key}?date=${date}`)),
      api(`/readings?from=${month}-01&to=${month}-${lastDayOfMonth(date)}`),
    ])
      .then(([daily, mtd, monthly, month]) => {
        if (cancelled) return;
        setReports({ daily, 'month-to-date': mtd, monthly });
        setMonthReadings(month.data);
        setError('');
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [date, dataVersion]);

  const report = REPORTS.find((r) => r.key === active);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Your numbers</p>
          <h1>Reports</h1>
        </div>
        <label className="date-pill">
          <span className="visually-hidden">Selected date</span>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
      </header>

      <div className="segmented" role="tablist" aria-label="Report period">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={active === r.key}
            className={active === r.key ? 'is-active' : ''}
            onClick={() => setActive(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <div className="notice notice-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}

      <ReportCard report={report} data={reports[active]} />
      <MonthChart date={date} readings={monthReadings} />
    </div>
  );
}
