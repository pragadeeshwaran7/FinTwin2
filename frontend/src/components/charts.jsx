// Shared chart primitives: palette roles, recessive axes/grid, and a hover tooltip
// that every chart uses so values never depend on colour alone.
import { cn } from '../lib/format';

export const SERIES = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);
export const STATUS = { good: 'var(--status-good)', warning: 'var(--status-warning)', serious: 'var(--status-serious)', critical: 'var(--status-critical)' };

export const axisProps = {
  stroke: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-text)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
};
export const gridProps = { stroke: 'var(--chart-grid)', strokeDasharray: '0', vertical: false };

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter = (v) => v, hideLabel = false }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== null && p.value !== undefined);
  if (!rows.length) return null;
  return (
    <div className="min-w-[140px] rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {!hideLabel && <div className="mb-1 font-medium text-foreground">{labelFormatter ? labelFormatter(label, payload) : label}</div>}
      {rows.map((p) => (
        <div key={p.dataKey ?? p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill || p.stroke }} />
            {p.name}
          </span>
          <span className="tabular font-medium text-foreground">{valueFormatter(Array.isArray(p.value) ? p.value : p.value, p)}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground', className)}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={cn('inline-block', it.dashed ? 'h-0 w-4 border-t-2 border-dashed' : it.line ? 'h-0.5 w-4 rounded' : 'h-2.5 w-2.5 rounded-sm')} style={it.dashed ? { borderColor: it.color } : { background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Tiny inline trend line for tables and tiles (no axes, no interaction). */
export function Sparkline({ data, width = 96, height = 28, positive = true }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 2 - ((v - min) / span) * (height - 4)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={positive ? 'var(--status-good)' : 'var(--status-critical)'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Semi-circular gauge for a 0..1 risk score with status colour + text label. */
export function RiskGauge({ value, size = 180 }) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const angle = Math.PI * (1 - v);
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const color = v >= 0.6 ? STATUS.critical : v >= 0.35 ? STATUS.serious : STATUS.good;
  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`} role="img" aria-label={`Risk ${Math.round(v * 100)} of 100`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--chart-grid)" strokeWidth="12" strokeLinecap="round" />
      {v > 0.005 && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />}
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground" style={{ fontSize: size / 5, fontWeight: 600 }}>
        {Math.round(v * 100)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--chart-text)' }}>
        out of 100
      </text>
    </svg>
  );
}
