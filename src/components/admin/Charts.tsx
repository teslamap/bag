import { useId, useState } from 'react';
import { cn, formatMoney, formatNumber } from '@/lib/utils';
import type { TimeSeriesPoint } from '@/lib/types';

const PALETTE = ['#c6aa82', '#8fc2a2', '#9dbdca', '#d8b77f', '#aab6e2', '#d88a8a', '#a59b90'];

export function TrendChart({
  points,
  metric = 'revenue',
  height = 220,
  className,
  compact = false,
  valueFormatter,
}: {
  points: TimeSeriesPoint[];
  metric?: 'revenue' | 'orders';
  height?: number;
  className?: string;
  compact?: boolean;
  valueFormatter?: (value: number) => string;
}) {
  const gradientId = useId().replace(/:/g, '');
  const [active, setActive] = useState<number | null>(null);
  const width = 720;
  const padding = { top: 14, right: 10, bottom: 24, left: compact ? 4 : 46 };
  const values = points.map((point) => point[metric]);
  const max = Math.max(1, ...values);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;
  const coords = points.map((point, index) => ({
    x: padding.left + index * step,
    y: padding.top + innerHeight - (point[metric] / max) * innerHeight,
    point,
  }));
  const line = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord.x.toFixed(1)},${coord.y.toFixed(1)}`).join(' ');
  const area = `${line} L${(padding.left + innerWidth).toFixed(1)},${(padding.top + innerHeight).toFixed(1)} L${padding.left},${(padding.top + innerHeight).toFixed(1)} Z`;
  const formatter = valueFormatter ?? (metric === 'revenue' ? (value: number) => formatMoney(value) : (value: number) => formatNumber(value));
  const ticks = [0, 0.5, 1];

  return (
    <div className={cn('relative w-full', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`${metric === 'revenue' ? 'შემოსავლის' : 'შეკვეთების'} გრაფიკი`}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={`grad-${gradientId}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c6aa82" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#c6aa82" stopOpacity="0" />
          </linearGradient>
        </defs>
        {!compact &&
          ticks.map((tick) => {
            const y = padding.top + innerHeight - tick * innerHeight;
            return (
              <g key={tick} className="chart-grid">
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-secondary)">
                  {formatter(Math.round(max * tick))}
                </text>
              </g>
            );
          })}
        <path d={area} fill={`url(#grad-${gradientId})`} />
        <path d={line} fill="none" stroke="#c6aa82" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((coord, index) => (
          <g key={coord.point.date}>
            <rect
              x={coord.x - step / 2}
              y={padding.top}
              width={Math.max(step, 8)}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setActive(index)}
            />
            {active === index && (
              <>
                <line x1={coord.x} x2={coord.x} y1={padding.top} y2={padding.top + innerHeight} stroke="var(--line-strong)" strokeDasharray="2 4" />
                <circle cx={coord.x} cy={coord.y} r="3" fill="#c6aa82" stroke="var(--surface-raised)" strokeWidth="2" />
              </>
            )}
          </g>
        ))}
        {!compact &&
          points.map((point, index) => {
            if (points.length > 14 && index % Math.ceil(points.length / 7) !== 0 && index !== points.length - 1) return null;
            return (
              <text key={point.date} x={coords[index].x} y={height - 6} textAnchor="middle" fontSize="8" fill="var(--text-secondary)">
                {point.label}
              </text>
            );
          })}
      </svg>
      {active !== null && coords[active] && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-[10px] shadow-xl"
          style={{
            left: `${Math.min(84, Math.max(2, (coords[active].x / width) * 100))}%`,
            top: `${Math.max(0, (coords[active].y / height) * 100 - 16)}%`,
          }}
        >
          <p className="text-[var(--text-secondary)]">{coords[active].point.label}</p>
          <p className="mt-0.5 font-medium text-[var(--text-primary)]">{formatter(coords[active].point[metric])}</p>
        </div>
      )}
    </div>
  );
}

export function MiniBars({
  points,
  metric = 'orders',
  className,
}: {
  points: TimeSeriesPoint[];
  metric?: 'revenue' | 'orders';
  className?: string;
}) {
  const max = Math.max(1, ...points.map((point) => point[metric]));
  return (
    <div className={cn('flex h-10 items-end gap-[3px]', className)} aria-hidden>
      {points.map((point) => (
        <span
          key={point.date}
          className="min-w-[2px] flex-1 rounded-sm bg-[#c6aa82]/60"
          style={{ height: `${Math.max(8, (point[metric] / max) * 100)}%` }}
          title={`${point.label}: ${metric === 'revenue' ? formatMoney(point[metric]) : point[metric]}`}
        />
      ))}
    </div>
  );
}

export function Donut({
  segments,
  centerLabel,
  centerValue,
  size = 150,
  className,
}: {
  segments: Array<{ label: string; value: number; color?: string }>;
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className={cn('flex items-center gap-5', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90" role="img" aria-label="განაწილების დიაგრამა">
          <circle cx="55" cy="55" r={radius} fill="none" stroke="var(--line)" strokeWidth="12" />
          {total > 0 &&
            segments.map((segment, index) => {
              const length = (segment.value / total) * circumference;
              const dash = `${Math.max(0, length - 2)} ${circumference - Math.max(0, length - 2)}`;
              const element = (
                <circle
                  key={segment.label}
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke={segment.color ?? PALETTE[index % PALETTE.length]}
                  strokeWidth="12"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += length;
              return element;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && <span className="text-lg font-medium tabular-nums text-[var(--text-primary)]">{centerValue}</span>}
          {centerLabel && <span className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{centerLabel}</span>}
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((segment, index) => (
          <li key={segment.label} className="flex items-center gap-2 text-[10px]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: segment.color ?? PALETTE[index % PALETTE.length] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">{segment.label}</span>
            <span className="tabular-nums text-[var(--text-primary)]">
              {total ? Math.round((segment.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HorizontalBars({
  data,
  formatter = formatMoney,
  className,
}: {
  data: Array<{ label: string; value: number; sub?: string }>;
  formatter?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((entry) => entry.value));
  if (!data.length) return <p className="py-6 text-center text-[10px] text-[var(--text-secondary)]">მონაცემები არ არის.</p>;
  return (
    <ul className={cn('space-y-3.5', className)}>
      {data.map((entry, index) => (
        <li key={entry.label}>
          <div className="flex items-baseline justify-between gap-3 text-[10px]">
            <span className="min-w-0 truncate text-[var(--text-secondary)]">{entry.label}</span>
            <span className="shrink-0 tabular-nums text-[var(--text-primary)]">{formatter(entry.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(3, (entry.value / max) * 100)}%`, background: PALETTE[index % PALETTE.length] }}
            />
          </div>
          {entry.sub && <p className="mt-1 text-[9px] text-[var(--text-secondary)]">{entry.sub}</p>}
        </li>
      ))}
    </ul>
  );
}
