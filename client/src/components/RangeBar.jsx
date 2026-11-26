// Horizontal stacked bar of low / in range / high counts, with a legend.
export default function RangeBar({ ranges, showLegend = true }) {
  const total = ranges.low + ranges.in_range + ranges.high;
  if (!total) return null;
  const pct = (n) => Math.round((n / total) * 100);
  const parts = [
    { key: 'low', label: 'Low', n: ranges.low },
    { key: 'in_range', label: 'In range', n: ranges.in_range },
    { key: 'high', label: 'High', n: ranges.high },
  ];
  return (
    <div className="range-bar-wrap">
      <div
        className="range-bar"
        role="img"
        aria-label={parts.map((p) => `${p.label} ${pct(p.n)}%`).join(', ')}
      >
        {parts.filter((p) => p.n > 0).map((p) => (
          <span key={p.key} className={`range-seg range-${p.key}`} style={{ flexGrow: p.n }} />
        ))}
      </div>
      {showLegend && (
        <ul className="range-legend">
          {parts.map((p) => (
            <li key={p.key}>
              <span className={`dot dot-${p.key}`} />
              {p.label} <strong>{pct(p.n)}%</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
