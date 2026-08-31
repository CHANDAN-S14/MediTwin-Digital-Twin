/**
 * Tone → classes.
 *
 * Six tones cover everything in this product: neutral, brand, ok, info, warn,
 * danger. Defining them once means a "critical" alert badge, a failed task row and
 * a robot in emergency stop are the same red everywhere, which is what lets an
 * operator read severity from colour alone without checking the label.
 *
 * Written as complete literal class strings, not composed at runtime, because
 * Tailwind scans source text — `bg-state-${tone}-tint` produces no CSS at all.
 */

export const TONES = ['neutral', 'brand', 'ok', 'info', 'warn', 'danger'];

/** Soft badge: tinted background, saturated text. */
export const BADGE_TONE = {
  neutral: 'bg-subtle text-muted ring-1 ring-line',
  brand: 'bg-brand-wash text-brand-deep ring-1 ring-brand-edge',
  ok: 'bg-state-ok-tint text-emerald-800 ring-1 ring-state-ok/25',
  info: 'bg-state-info-tint text-sky-800 ring-1 ring-state-info/25',
  warn: 'bg-state-warn-tint text-amber-800 ring-1 ring-state-warn/30',
  danger: 'bg-state-danger-tint text-red-800 ring-1 ring-state-danger/25',
};

/** Solid dot, for status indicators and legends. */
export const DOT_TONE = {
  neutral: 'bg-faint',
  brand: 'bg-brand',
  ok: 'bg-state-ok',
  info: 'bg-state-info',
  warn: 'bg-state-warn',
  danger: 'bg-state-danger',
};

/** Foreground only, for figures and inline emphasis. */
export const TEXT_TONE = {
  neutral: 'text-muted',
  brand: 'text-brand-deep',
  ok: 'text-state-ok',
  info: 'text-state-info',
  warn: 'text-state-warn',
  danger: 'text-state-danger',
};

/** Fill, for progress bars and meters. */
export const FILL_TONE = {
  neutral: 'bg-faint',
  brand: 'bg-brand',
  ok: 'bg-state-ok',
  info: 'bg-state-info',
  warn: 'bg-state-warn',
  danger: 'bg-state-danger',
};

/** Left border, for banner and callout strips. */
export const EDGE_TONE = {
  neutral: 'border-line',
  brand: 'border-brand',
  ok: 'border-state-ok',
  info: 'border-state-info',
  warn: 'border-state-warn',
  danger: 'border-state-danger',
};

/** Tinted panel background with a matching hairline. */
export const PANEL_TONE = {
  neutral: 'bg-subtle border-line',
  brand: 'bg-brand-wash border-brand-edge',
  ok: 'bg-state-ok-tint border-state-ok/25',
  info: 'bg-state-info-tint border-state-info/25',
  warn: 'bg-state-warn-tint border-state-warn/30',
  danger: 'bg-state-danger-tint border-state-danger/25',
};

export const tone = (map, key, fallback = 'neutral') => map[key] ?? map[fallback];

/**
 * Battery level → tone.
 *
 * 20% is where the simulator sends a robot home, so that is where the colour has
 * to change: an operator seeing amber should already know a return is imminent.
 */
export const batteryTone = (percent) => {
  if (percent === null || percent === undefined) return 'neutral';
  if (percent <= 20) return 'danger';
  if (percent <= 40) return 'warn';
  return 'ok';
};

/** Compartment fill → tone. Inverted from battery: full is the bad end. */
export const fillTone = (ratio) => {
  if (ratio === null || ratio === undefined) return 'neutral';
  if (ratio >= 0.95) return 'danger';
  if (ratio >= 0.8) return 'warn';
  return 'ok';
};

/**
 * Classifier confidence → tone.
 * Amber below the 0.75 review threshold, because that is the point at which the
 * API stops acting on the result by itself.
 */
export const confidenceTone = (confidence) => {
  if (confidence === null || confidence === undefined) return 'neutral';
  if (confidence >= 0.9) return 'ok';
  if (confidence >= 0.75) return 'info';
  if (confidence > 0) return 'warn';
  return 'danger';
};
