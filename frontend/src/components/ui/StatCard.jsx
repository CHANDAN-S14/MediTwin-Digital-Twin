import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { TEXT_TONE } from './tones.js';
import { Skeleton } from './Feedback.jsx';

/**
 * The metric tile.
 *
 * Four of these run across the top of the dashboard in the reference layout. The
 * figure is the largest thing on the card and the label sits above it, because
 * someone glancing at a wall monitor reads the number first and only looks for the
 * label if the number surprises them.
 */

/**
 * `direction` says which way is good, and it is not always up.
 *
 * Waste volume rising is not an improvement, and misclassification rate falling
 * is. Getting this wrong paints a bad trend green, which is worse than showing no
 * colour at all — so `neutral` is the default and callers opt in.
 */
const trendTone = (value, direction) => {
  if (value === null || value === undefined || Number(value) === 0) return 'neutral';
  const rising = Number(value) > 0;
  if (direction === 'up') return rising ? 'ok' : 'danger';
  if (direction === 'down') return rising ? 'danger' : 'ok';
  return 'neutral';
};

export default function StatCard({
  label,
  value,
  unit,
  hint,
  trend = null,
  direction = 'neutral',
  icon: Icon,
  accent = 'brand',
  loading = false,
  footer,
  className,
}) {
  const tone = trendTone(trend, direction);
  const TrendIcon = trend === null || Number(trend) === 0 ? Minus : Number(trend) > 0 ? ArrowUpRight : ArrowDownRight;

  const ACCENT = {
    brand: 'bg-brand-wash text-brand-deep ring-brand-edge',
    ok: 'bg-state-ok-tint text-emerald-700 ring-state-ok/20',
    info: 'bg-state-info-tint text-sky-700 ring-state-info/20',
    warn: 'bg-state-warn-tint text-amber-700 ring-state-warn/25',
    danger: 'bg-state-danger-tint text-red-700 ring-state-danger/20',
  };

  return (
    <div
      className={clsx(
        'group relative overflow-hidden rounded-card border border-line bg-surface p-4 shadow-card transition hover:shadow-raised',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {Icon ? (
          <span
            className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1',
              ACCENT[accent] ?? ACCENT.brand
            )}
          >
            <Icon size={15} aria-hidden="true" />
          </span>
        ) : null}
      </div>

      {loading ? (
        <Skeleton className="mt-2.5 h-8 w-24" />
      ) : (
        <p className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-metric font-semibold text-ink">{value}</span>
          {unit ? <span className="text-sm font-medium text-faint">{unit}</span> : null}
        </p>
      )}

      <div className="mt-1.5 flex items-center gap-2">
        {trend !== null && !loading ? (
          <span className={clsx('inline-flex items-center gap-0.5 text-xs font-medium', TEXT_TONE[tone])}>
            <TrendIcon size={13} aria-hidden="true" />
            {Math.abs(Number(trend)).toFixed(0)}%
          </span>
        ) : null}
        {hint ? <span className="truncate text-xs text-muted">{hint}</span> : null}
      </div>

      {footer ? <div className="mt-3 border-t border-line pt-3">{footer}</div> : null}
    </div>
  );
}
