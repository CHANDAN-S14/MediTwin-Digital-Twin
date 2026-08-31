import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button.jsx';

/**
 * Tables.
 *
 * The waste register and audit trail are the two screens someone will actually
 * read for ten minutes at a stretch, so these lean dense: 40px rows, hairline
 * separators, no zebra striping. Striping fights with the category colours, which
 * are the only colour that should carry meaning in a row.
 *
 * Numeric columns are right-aligned and tabular — a column of weights you cannot
 * compare by eye is a column of decoration.
 */

export function Table({ children, className, minWidth = 'min-w-[52rem]' }) {
  return (
    <div className="scroll-slim -mx-5 overflow-x-auto px-5">
      <table className={clsx('w-full border-collapse text-left', minWidth, className)}>{children}</table>
    </div>
  );
}

export function THead({ children, sticky = false }) {
  return (
    <thead
      className={clsx(
        'border-b border-line',
        // Sticky only inside a scroll container tall enough to need it; the offset
        // matches the app header so the two never overlap mid-scroll.
        sticky && 'sticky top-0 z-10 bg-surface'
      )}
    >
      {children}
    </thead>
  );
}

export function TH({ children, align = 'left', className, width }) {
  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={clsx(
        'whitespace-nowrap px-3 pb-2 pt-0 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-faint',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

/**
 * A row. `onClick` makes it behave like a button: keyboard-focusable and
 * activatable with Enter, because a clickable div that a keyboard cannot reach is
 * not clickable for everyone.
 */
export function TR({ children, onClick, selected = false, tone, className }) {
  const interactive = Boolean(onClick);

  return (
    <tr
      onClick={onClick}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick(event);
              }
            }
          : undefined
      }
      className={clsx(
        'transition-colors',
        interactive && 'cursor-pointer hover:bg-canvas focus-visible:bg-brand-wash focus-visible:outline-none',
        selected && 'bg-brand-wash',
        tone,
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TD({ children, align = 'left', mono = false, muted = false, className, colSpan }) {
  return (
    <td
      colSpan={colSpan}
      className={clsx(
        'px-3 py-2.5 text-[0.8125rem] align-middle',
        align === 'right' && 'text-right tabular-nums',
        align === 'center' && 'text-center',
        mono && 'font-mono text-xs',
        muted ? 'text-muted' : 'text-ink',
        className
      )}
    >
      {children}
    </td>
  );
}

/**
 * Offset pagination controls.
 *
 * Shows the range rather than only the page number — "showing 21–40 of 312" tells
 * an auditor where they are in a register, which "page 2" does not.
 */
export function Pagination({ page, pageSize, total, onPage, className }) {
  const pages = Math.max(1, Math.ceil((total ?? 0) / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total ?? 0);

  return (
    <div className={clsx('flex items-center justify-between gap-4 border-t border-line pt-3', className)}>
      <p className="text-xs text-muted">
        {total === 0 ? (
          'No records'
        ) : (
          <>
            Showing <span className="font-medium text-ink">{from}</span>–
            <span className="font-medium text-ink">{to}</span> of{' '}
            <span className="font-medium text-ink">{total}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          size="xs"
          variant="ghost"
          icon={ChevronLeft}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <span className="px-1 text-xs tabular-nums text-muted">
          {page} / {pages}
        </span>
        <Button
          size="xs"
          variant="ghost"
          iconRight={ChevronRight}
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
