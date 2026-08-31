import clsx from 'clsx';
import { BADGE_TONE, DOT_TONE } from './tones.js';
import { categoryMeta, stateMeta } from '../../lib/constants.js';

/**
 * Badges and status dots.
 *
 * The category badge is the one to get right: it is how a person verifies at a
 * glance that an item went into the legally correct stream, so it always shows the
 * colour *and* the word. Colour alone would fail for the ~8% of men with red-green
 * colour vision deficiency — on a page about not mixing red and yellow waste.
 */

export default function Badge({ tone = 'neutral', dot = false, size = 'sm', className, children }) {
  const pad = size === 'xs' ? 'h-5 px-1.5 text-[0.6875rem]' : 'h-6 px-2 text-xs';

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill font-medium',
        pad,
        BADGE_TONE[tone] ?? BADGE_TONE.neutral,
        className
      )}
    >
      {dot ? <span className={clsx('h-1.5 w-1.5 rounded-full', DOT_TONE[tone] ?? DOT_TONE.neutral)} /> : null}
      {children}
    </span>
  );
}

/** A waste category, in its mandated colour. */
export function CategoryBadge({ category, size = 'sm', showTreatment = false, className }) {
  const meta = categoryMeta(category);
  const pad = size === 'xs' ? 'h-5 px-1.5 text-[0.6875rem]' : 'h-6 px-2 text-xs';

  return (
    <span
      title={showTreatment ? meta.treatment : undefined}
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill font-medium ring-1',
        pad,
        meta.badge,
        meta.ring,
        className
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

/** A robot lifecycle state, toned by what it means. */
export function StateBadge({ state, size = 'sm', className }) {
  const meta = stateMeta(state);
  return (
    <Badge tone={meta.tone} dot size={size} className={className}>
      {meta.label}
    </Badge>
  );
}

/**
 * The live indicator.
 *
 * Breathes slowly when connected and sits still when not. A pulsing dot next to
 * numbers that have stopped updating is an actively misleading interface, so the
 * animation is tied to the socket rather than being decorative.
 */
export function LiveDot({ live = true, tone = 'ok', className }) {
  return (
    <span className={clsx('relative flex h-2 w-2 shrink-0', className)}>
      {live ? (
        <span
          className={clsx('absolute inset-0 rounded-full animate-ring-out', DOT_TONE[tone] ?? DOT_TONE.ok)}
          aria-hidden="true"
        />
      ) : null}
      <span
        className={clsx(
          'relative h-2 w-2 rounded-full',
          live ? DOT_TONE[tone] ?? DOT_TONE.ok : 'bg-faint'
        )}
      />
    </span>
  );
}

/** A monospaced identifier — waste id, compartment id, task id. */
export function Ident({ children, className, title }) {
  return (
    <span title={title} className={clsx('ident', className)}>
      {children}
    </span>
  );
}
