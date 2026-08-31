import { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

/**
 * Buttons.
 *
 * Five variants, and the split between them is about consequence rather than
 * decoration. `primary` is the one action a page is for. `danger` is reserved for
 * emergency stop and deletion — the two things in this product that are hard to
 * undo. Everything else is secondary or ghost.
 */

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition ' +
  'disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

const VARIANTS = {
  primary:
    'bg-brand text-white shadow-sm hover:bg-brand-deep active:bg-brand-deep enabled:hover:shadow-brand-glow',
  secondary: 'border border-line bg-surface text-ink shadow-card hover:bg-subtle hover:border-faint/40',
  ghost: 'text-muted hover:bg-subtle hover:text-ink',
  danger: 'bg-state-danger text-white shadow-sm hover:bg-red-700',
  quiet: 'bg-subtle text-ink hover:bg-line',
};

const SIZES = {
  xs: 'h-7 px-2.5 text-xs',
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[0.9375rem]',
};

const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon: Icon = null,
    iconRight: IconRight = null,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      // A button mid-request must not be clickable again. This is the whole
      // defence against a double-click dispatching two robots.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(BASE, VARIANTS[variant] ?? VARIANTS.secondary, SIZES[size] ?? SIZES.md, className)}
      {...rest}
    >
      {loading ? (
        <Loader2 size={size === 'xs' ? 13 : 15} className="animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon size={size === 'xs' ? 13 : 16} aria-hidden="true" />
      )}
      {children}
      {IconRight && !loading ? <IconRight size={size === 'xs' ? 13 : 16} aria-hidden="true" /> : null}
    </button>
  );
});

export default Button;

/**
 * A square button holding only an icon.
 * `label` is required and becomes the accessible name — an icon alone is
 * unlabelled to a screen reader, and "button" is not a useful announcement.
 */
export function IconButton({ icon: Icon, label, size = 'md', variant = 'ghost', className, ...rest }) {
  const box = { xs: 'h-7 w-7', sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-10 w-10' }[size] ?? 'h-9 w-9';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        BASE,
        VARIANTS[variant] ?? VARIANTS.ghost,
        box,
        'shrink-0 rounded-lg p-0',
        className
      )}
      {...rest}
    >
      <Icon size={size === 'xs' ? 14 : 16} aria-hidden="true" />
    </button>
  );
}

/** A row of mutually exclusive filters, as used above every table. */
export function SegmentedControl({ options, value, onChange, className, size = 'sm' }) {
  const pad = size === 'xs' ? 'h-6 px-2 text-[0.6875rem]' : 'h-7 px-2.5 text-xs';

  return (
    <div
      role="tablist"
      className={clsx('inline-flex items-center gap-0.5 rounded-lg border border-line bg-subtle p-0.5', className)}
    >
      {options.map((option) => {
        const key = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        const active = key === value;

        return (
          <button
            key={key ?? 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={clsx(
              'rounded-md font-medium transition',
              pad,
              active ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
