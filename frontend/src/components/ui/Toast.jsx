import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { PANEL_TONE, TEXT_TONE } from './tones.js';

/**
 * The toast stack.
 *
 * Bottom-right rather than top-right: the top of every page in this layout is a
 * header with live counters, and covering those is covering the thing the operator
 * is watching.
 */

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warn: AlertTriangle,
  info: Info,
};

const TONE_FOR = { success: 'ok', error: 'danger', warn: 'warn', info: 'info' };

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    // aria-live so a screen reader announces a failed dispatch rather than
    // leaving it as a purely visual event. `polite` and not `assertive`: these
    // interrupt nothing, they report what already happened.
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2.5"
    >
      {toasts.map((toast) => {
        const key = TONE_FOR[toast.tone] ?? 'info';
        const Icon = ICONS[toast.tone] ?? Info;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex animate-fade-up items-start gap-3 rounded-card border bg-surface p-3.5 shadow-pop ${PANEL_TONE[key]}`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${TEXT_TONE[key]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-ink">{toast.message}</p>
              {toast.detail ? (
                <p className="mt-1 break-words text-xs leading-relaxed text-muted">{toast.detail}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="-m-1 shrink-0 rounded-md p-1 text-faint transition hover:bg-subtle hover:text-muted"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
