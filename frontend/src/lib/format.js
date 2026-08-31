/**
 * Formatters.
 *
 * Centralised because inconsistent number and date formatting across a dashboard
 * makes it look untrustworthy, and because several of these have a defensible
 * choice inside them that should be made once.
 */

/** en-IN grouping: this is a hospital in Bengaluru, so 1,20,000 not 120,000. */
const numberFormat = new Intl.NumberFormat('en-IN');

export const num = (value) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? '—'
    : numberFormat.format(Number(value));

/**
 * Weight in kilograms.
 *
 * Two decimals below 10 kg and one above. A single sharps item is ~0.03 kg, so
 * rounding to one decimal would display it as 0.0 — but a 42.7 kg daily total does
 * not need hundredths of a gram of false precision.
 */
export const kg = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return `${n < 10 ? n.toFixed(2) : n.toFixed(1)} kg`;
};

/**
 * A confidence or fill ratio as a percentage.
 *
 * Never rounds a value below 1 up to "1%" — a 0.4% figure displayed as 1% is a
 * 150% error, and on this dashboard the small values are the interesting ones.
 */
export const percent = (ratio, digits = 0) => {
  if (ratio === null || ratio === undefined || Number.isNaN(Number(ratio))) return '—';
  const value = Number(ratio) * 100;
  if (value > 0 && value < 1) return '<1%';
  return `${value.toFixed(digits)}%`;
};

/** A value already expressed as 0–100. */
export const pct = (value, digits = 0) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? '—'
    : `${Number(value).toFixed(digits)}%`;

/** Grid coordinate, as the planner writes it. */
export const cell = (location) =>
  location && typeof location.x === 'number' ? `${location.x}, ${location.y}` : '—';

const pad = (n) => String(n).padStart(2, '0');

export const time = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const dateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

export const dayLabel = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/**
 * Relative time, for "last seen" and audit rows.
 *
 * Stops at "3d ago" and switches to a date after a week. "37d ago" is harder to
 * reason about than "21 Jul", which is the point where relative time stops being
 * the more useful form.
 */
export const ago = (value) => {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days}d ago`;

  return dayLabel(value);
};

/** Seconds as a duration a person can read: 2m 14s. */
export const duration = (seconds) => {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return '—';
  const total = Math.max(0, Math.round(Number(seconds)));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

/** Elapsed time between two timestamps, as a duration. */
export const elapsed = (from, to) => {
  if (!from) return '—';
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return '—';
  return duration((end - start) / 1000);
};

/** A signed delta for a day-over-day figure. */
export const delta = (value, digits = 0) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
};

export const titleCase = (value) =>
  typeof value === 'string' && value.length
    ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')
    : '—';

/** Turns `low_confidence_classification` into `Low confidence classification`. */
export const humanise = (value) =>
  typeof value === 'string' ? titleCase(value.replace(/[_.]/g, ' ')) : '—';

export const initials = (name) =>
  typeof name === 'string'
    ? name
        .replace(/^(Dr\.?|Sister|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
    : '?';
