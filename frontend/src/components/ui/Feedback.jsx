import clsx from 'clsx';
import { AlertCircle, Inbox, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import Button from './Button.jsx';

/**
 * Loading, empty and failed states.
 *
 * These three get the same care as the success case on purpose. A dashboard is
 * judged on the day the API is down, and "nothing collected yet" is a normal
 * Sunday morning, not a bug — so the empty state says what it means rather than
 * showing a spinner forever.
 */

export function Spinner({ size = 18, className }) {
  return (
    <Loader2
      size={size}
      className={clsx('animate-spin text-brand', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Centred spinner for a card or page that has nothing to show yet. */
export function Loading({ label = 'Loading', className, height = 'h-40' }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', height, className)}>
      <Spinner size={22} />
      <p className="text-xs text-muted">{label}…</p>
    </div>
  );
}

/**
 * Grey blocks in the shape of the content that is coming.
 *
 * Preferred over a spinner where the layout is known, because the page does not
 * jump when data lands — and a 300ms spinner is just a flash of noise.
 */
export function Skeleton({ className }) {
  return <div className={clsx('shimmer rounded-md bg-subtle', className)} />;
}

export function SkeletonRows({ rows = 5, className }) {
  return (
    <div className={clsx('space-y-2.5', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-5 w-20 rounded-pill" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message,
  action,
  className,
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-subtle text-faint">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {message ? <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * A failed fetch.
 *
 * Shows the message the API gave rather than "an error occurred". The whole point
 * of the message mapping in services/api.js is that this string is useful, and
 * hiding it behind a generic label throws that away.
 */
export function ErrorState({ error, onRetry, className, compact = false }) {
  const offline = typeof error === 'string' && error.startsWith('Cannot reach');
  const Icon = offline ? WifiOff : AlertCircle;

  if (compact) {
    return (
      <div
        className={clsx(
          'flex items-start gap-2.5 rounded-lg border border-state-danger/25 bg-state-danger-tint px-3 py-2.5',
          className
        )}
      >
        <Icon size={15} className="mt-px shrink-0 text-state-danger" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-red-800">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={() => onRetry()}
            className="ml-auto shrink-0 text-xs font-medium text-red-800 underline decoration-red-800/30 underline-offset-2 hover:decoration-red-800"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-state-danger-tint text-state-danger">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-ink">
        {offline ? 'The API is not responding' : 'That did not load'}
      </p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">{error}</p>
      {onRetry ? (
        <Button size="sm" icon={RefreshCw} className="mt-4" onClick={() => onRetry()}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Wraps the three states so a page body reads as one expression.
 *
 * Deliberately shows children when data exists even if `error` is set — a failed
 * background poll should leave the last good numbers on screen with a warning
 * strip, not replace a working dashboard with an error page.
 */
export function AsyncBoundary({
  loading,
  error,
  data,
  onRetry,
  skeleton = null,
  empty = null,
  isEmpty = (value) => Array.isArray(value) && value.length === 0,
  children,
}) {
  if (loading && data === null) return skeleton ?? <Loading />;
  if (error && data === null) return <ErrorState error={error} onRetry={onRetry} />;
  if (data !== null && isEmpty(data)) return empty ?? <EmptyState />;

  return (
    <>
      {error ? <ErrorState compact error={error} onRetry={onRetry} className="mb-3" /> : null}
      {children}
    </>
  );
}
