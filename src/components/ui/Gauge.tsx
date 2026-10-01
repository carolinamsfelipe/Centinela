function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
  const p1 = polar(cx, cy, r, a1);
  const p2 = polar(cx, cy, r, a2);
  const large = Math.abs(a1 - a2) > 180 ? 1 : 0;
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

/** Gauge semicircular genérico: value/min/max definen la aguja; zonas definen los 3 tramos de color. */
export function Gauge({
  value,
  min,
  max,
  zonas,
}: {
  value: number | null;
  min: number;
  max: number;
  zonas: [number, number]; // [fin de zona roja, fin de zona amarilla] en la misma escala que value
}) {
  const cx = 110;
  const cy = 100;
  const r = 84;

  const angleFor = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    return 180 - ((clamped - min) / (max - min)) * 180;
  };

  const a0 = 180;
  const a1 = angleFor(zonas[0]);
  const a2 = angleFor(zonas[1]);
  const a3 = 0;
  const needleAngle = value !== null ? angleFor(value) : 90;
  const tip = polar(cx, cy, r - 16, needleAngle);

  return (
    <svg width="100%" height="120" viewBox="0 0 220 118" role="img" aria-label="Medidor de riesgo">
      <path d={arcPath(cx, cy, r, a0, a1)} stroke="rgb(var(--bad))" strokeWidth={14} fill="none" strokeLinecap="round" />
      <path d={arcPath(cx, cy, r, a1, a2)} stroke="rgb(var(--warn))" strokeWidth={14} fill="none" strokeLinecap="round" />
      <path d={arcPath(cx, cy, r, a2, a3)} stroke="rgb(var(--ok))" strokeWidth={14} fill="none" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="rgb(var(--ink))" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5.5} fill="rgb(var(--ink))" />
      <text x={18} y={116} fontSize={10} fill="rgb(var(--ink-muted))">{min}</text>
      <text x={196} y={116} fontSize={10} fill="rgb(var(--ink-muted))" textAnchor="end">{max}</text>
    </svg>
  );
}
