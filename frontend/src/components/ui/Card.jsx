import clsx from 'clsx';

/**
 * The card.
 *
 * Every panel in the reference layout is the same object: white surface, hairline
 * border, 14px radius, barely-there shadow. Uniformity is the point — the page
 * reads as one instrument rather than a collection of widgets, and depth is
 * reserved for things that actually float, like modals and toasts.
 */

export default function Card({ as: Tag = 'section', padded = true, className, children, ...rest }) {
  return (
    <Tag
      className={clsx(
        'rounded-card border border-line bg-surface shadow-card',
        padded && 'p-5',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Card header.
 *
 * `eyebrow` is the small uppercase label above the title. It is a real role in
 * this layout rather than ornament: it says what kind of thing the card is, so the
 * title is free to say what this particular one contains.
 */
export function CardHeader({ eyebrow, title, subtitle, action, icon: Icon, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-wash text-brand-deep ring-1 ring-brand-edge">
            <Icon size={17} aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? (
            <h2 className="truncate text-[0.9375rem] font-semibold leading-6 text-ink">{title}</h2>
          ) : null}
          {subtitle ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Divider between a header and its content, or between rows inside a card. */
export function CardDivider({ className }) {
  return <div className={clsx('-mx-5 my-4 border-t border-line', className)} />;
}

/** A page-level section heading, outside any card. */
export function SectionTitle({ eyebrow, title, subtitle, action, className }) {
  return (
    <div className={clsx('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * A labelled value, as used down the side of the robot and waste detail panels.
 * `mono` for anything read character by character — ids and coordinates.
 */
export function DataRow({ label, value, mono = false, tone, className }) {
  return (
    <div className={clsx('flex items-baseline justify-between gap-4 py-1.5', className)}>
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd
        className={clsx(
          'min-w-0 truncate text-right text-[0.8125rem] font-medium',
          mono && 'font-mono text-xs',
          tone ?? 'text-ink'
        )}
      >
        {value}
      </dd>
    </div>
  );
}
