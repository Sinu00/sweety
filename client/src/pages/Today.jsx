import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../AppContext';
import Icon from '../components/Icon';
import DayRing from '../components/DayRing';
import RangeBar from '../components/RangeBar';
import {
  SLOTS, RANGE_LABELS, addDays, classify, dayOfMonth, friendlyDate, greeting, todayString, weekday,
} from '../slots';

function WeekStrip({ end, selected, counts, onSelect, onShift }) {
  const today = todayString();
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
  return (
    <div className="week">
      <button type="button" className="icon-btn" onClick={() => onShift(-7)} aria-label="Previous week">
        <Icon name="left" size={20} />
      </button>
      <ol className="week-days">
        {days.map((d) => {
          const future = d > today;
          const n = counts[d] || 0;
          return (
            <li key={d}>
              <button
                type="button"
                className={`week-day ${d === selected ? 'is-selected' : ''} ${d === today ? 'is-today' : ''}`}
                disabled={future}
                onClick={() => onSelect(d)}
                aria-pressed={d === selected}
                aria-label={`${friendlyDate(d)}, ${n} of 4 readings`}
              >
                <span className="week-day-name">{weekday(d).slice(0, 1)}</span>
                <span className="week-day-num">{dayOfMonth(d)}</span>
                <span className="week-day-dots" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="icon-btn"
        onClick={() => onShift(7)}
        disabled={end >= today}
        aria-label="Next week"
      >
        <Icon name="right" size={20} />
      </button>
    </div>
  );
}

function Insights({ data }) {
  const [summary, setSummary] = useState('');
  const [aiError, setAiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function askAi() {
    setLoading(true);
    setAiError('');
    try {
      const res = await api('/insights/summary', { method: 'POST', body: { date: todayString() } });
      setSummary(res.text);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section" aria-labelledby="insights-title">
      <div className="section-head">
        <h2 id="insights-title">Last 14 days</h2>
      </div>
      <div className="tiles">
        <div className="tile">
          <span className="tile-icon tile-icon-flame"><Icon name="flame" size={18} /></span>
          <span className="tile-value">{data.streak}<small> day{data.streak === 1 ? '' : 's'}</small></span>
          <span className="tile-label">Logging streak</span>
        </div>
        <div className="tile">
          <span className="tile-icon tile-icon-target"><Icon name="target" size={18} /></span>
          <span className="tile-value">{data.inRangePct ?? '–'}<small>%</small></span>
          <span className="tile-label">Time in range</span>
        </div>
        <div className="tile">
          <span className="tile-icon"><Icon name="drop" size={18} /></span>
          <span className="tile-value">{data.average ?? '–'}</span>
          <span className="tile-label">Avg mg/dl</span>
        </div>
      </div>

      {data.count > 0 && (
        <div className="card">
          <RangeBar ranges={data.ranges} />
        </div>
      )}

      <ul className="tips">
        {data.tips.map((t) => (
          <li key={t.text} className={`tip tip-${t.tone}`}>
            <span className="tip-dot" aria-hidden="true" />
            {t.text}
          </li>
        ))}
      </ul>

      {data.aiAvailable && data.count > 0 && (
        <div className="card ai-card">
          <div className="ai-head">
            <span className="tile-icon tile-icon-ai"><Icon name="sparkles" size={18} /></span>
            <div>
              <h3>Weekly check-in</h3>
              <p className="muted small">Written by AI from your 14-day numbers only. Not medical advice.</p>
            </div>
          </div>
          {summary && <p className="ai-text">{summary}</p>}
          {aiError && <p className="notice notice-error" role="alert">{aiError}</p>}
          <button type="button" className="btn btn-ghost btn-block" onClick={askAi} disabled={loading}>
            {loading ? 'Writing…' : summary ? 'Write it again' : 'Write my check-in'}
          </button>
        </div>
      )}
    </section>
  );
}

export default function Today() {
  const { user, openReading, dataVersion } = useApp();
  const today = todayString();
  const [weekEnd, setWeekEnd] = useState(today);
  const [selected, setSelected] = useState(today);
  const [weekReadings, setWeekReadings] = useState([]);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api(`/readings?from=${addDays(weekEnd, -6)}&to=${weekEnd}`)
      .then((res) => {
        if (cancelled) return;
        setWeekReadings(res.data);
        setError('');
        setLoaded(true);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [weekEnd, dataVersion]);

  useEffect(() => {
    let cancelled = false;
    api(`/insights?date=${today}`)
      .then((res) => !cancelled && setInsights(res))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [today, dataVersion]);

  function shiftWeek(days) {
    const next = addDays(weekEnd, days);
    const end = next > today ? today : next;
    setWeekEnd(end);
    setSelected(end);
  }

  const counts = {};
  weekReadings.forEach((r) => { counts[r.date] = (counts[r.date] || 0) + 1; });
  const dayReadings = weekReadings.filter((r) => r.date === selected);
  const dayAvg = dayReadings.length
    ? Math.round(dayReadings.reduce((a, r) => a + r.value, 0) / dayReadings.length)
    : null;
  const nextSlot = SLOTS.find((s) => !dayReadings.some((r) => r.slot === s.key));
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{greeting()}</p>
          <h1>{firstName || 'Welcome'}</h1>
        </div>
        <Link to="/profile" className="avatar" aria-label="Profile">
          {(firstName[0] || 'S').toUpperCase()}
        </Link>
      </header>

      <WeekStrip end={weekEnd} selected={selected} counts={counts} onSelect={setSelected} onShift={shiftWeek} />

      {error && <div className="notice notice-error" role="alert"><Icon name="info" size={18} /><span>{error}</span></div>}

      <section className="hero-card" aria-label={`Summary for ${friendlyDate(selected)}`}>
        <div className="hero-ring">
          <DayRing readings={dayReadings} />
          <div className="hero-ring-center">
            <strong>{dayReadings.length}<span>/4</span></strong>
            <small>logged</small>
          </div>
        </div>
        <div className="hero-body">
          <p className="hero-date">{friendlyDate(selected)}</p>
          {dayAvg !== null ? (
            <>
              <p className="hero-value">{dayAvg}<span> mg/dl avg</span></p>
              <span className={`pill pill-${classify(dayAvg)} on-dark`}>{RANGE_LABELS[classify(dayAvg)]}</span>
            </>
          ) : (
            <p className="hero-empty">{loaded ? 'No readings yet' : 'Loading…'}</p>
          )}
          {nextSlot && (
            <button
              type="button"
              className="btn btn-accent btn-sm"
              onClick={() => openReading({ date: selected, slot: nextSlot.key })}
            >
              <Icon name="plus" size={16} strokeWidth={2.4} /> Log {nextSlot.short.toLowerCase()}
            </button>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="slots-title">
        <div className="section-head">
          <h2 id="slots-title">Readings</h2>
          <span className="muted small">Tap to add or edit</span>
        </div>
        <ul className="slot-list">
          {SLOTS.map((s) => {
            const r = dayReadings.find((x) => x.slot === s.key);
            const range = r ? classify(r.value) : null;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  className={`slot-card ${r ? `has-value is-${range}` : ''}`}
                  onClick={() => openReading(r ? { editing: r } : { date: selected, slot: s.key })}
                >
                  <span className="slot-icon"><Icon name={s.icon} size={20} /></span>
                  <span className="slot-text">
                    <span className="slot-name">{s.label}</span>
                    <span className="slot-sub">{r ? RANGE_LABELS[range] : 'Not logged'}</span>
                  </span>
                  {r ? (
                    <span className="slot-value">{r.value}<small>mg/dl</small></span>
                  ) : (
                    <span className="slot-add" aria-hidden="true"><Icon name="plus" size={18} strokeWidth={2.2} /></span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {insights && <Insights data={insights} />}
    </div>
  );
}
