import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AlertTriangle, X } from 'lucide-react';
import Button, { IconButton } from './Button.jsx';

/**
 * Modal dialog.
 *
 * Hand-rolled rather than pulled from a component library, because the only
 * behaviours actually needed here are escape-to-close, a focus trap and a scroll
 * lock — and a headless UI dependency for three behaviours is a poor trade in a
 * project that already ships three.js.
 */

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  footer,
  children,
  closeOnBackdrop = true,
}) {
  const panel = useRef(null);
  const restoreFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    restoreFocus.current = document.activeElement;

    // Move focus into the dialog. Without this the keyboard is still on the page
    // behind, so Tab walks through content the user cannot see.
    const timer = setTimeout(() => {
      const focusable = panel.current?.querySelector(
        'input:not([type="hidden"]), select, textarea, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? panel.current)?.focus();
    }, 0);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      // The trap: wrap from last to first and back, so Tab cannot escape into
      // the inert page behind the overlay.
      const nodes = panel.current?.querySelectorAll(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!nodes || nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    // Scroll lock. Padding compensates for the vanished scrollbar, otherwise the
    // whole page shifts sideways as the modal opens.
    const { overflow, paddingRight } = document.body.style;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 bg-ink/25 backdrop-blur-[2px]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        tabIndex={-1}
        className={clsx(
          'relative w-full animate-fade-up rounded-card border border-line bg-surface shadow-pop focus:outline-none',
          SIZES[size] ?? SIZES.md
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p> : null}
          </div>
          <IconButton icon={X} label="Close dialog" size="sm" onClick={onClose} />
        </div>

        <div className="scroll-slim max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-canvas px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

/**
 * Confirmation before something irreversible.
 *
 * Used for deleting a waste record and for emptying a compartment — both of which
 * change a regulated register. The confirm button carries the verb ("Delete
 * record"), never "OK", so the last thing read before committing says what will
 * happen.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  pending = false,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnBackdrop={!pending}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-state-danger-tint text-state-danger">
            <AlertTriangle size={17} aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-ink">{message}</p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </Modal>
  );
}
