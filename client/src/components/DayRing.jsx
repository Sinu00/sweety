import { SLOTS, classify } from '../slots';

// Four-segment ring: one arc per time slot, coloured by that reading's range.
export default function DayRing({ readings, size = 132, stroke = 12 }) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const gap = 14; // degrees between segments
  const sweep = 90 - gap;

  const arc = (startDeg, endDeg) => {
    const toXY = (deg) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return [c + r * Math.cos(rad), c + r * Math.sin(rad)];
    };
    const [x1, y1] = toXY(startDeg);
    const [x2, y2] = toXY(endDeg);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="day-ring" aria-hidden="true">
      {SLOTS.map((s, i) => {
        const reading = readings.find((x) => x.slot === s.key);
        const start = i * 90 + gap / 2;
        return (
          <path
            key={s.key}
            d={arc(start, start + sweep)}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            className={reading ? `seg seg-${classify(reading.value)}` : 'seg seg-empty'}
          />
        );
      })}
    </svg>
  );
}
