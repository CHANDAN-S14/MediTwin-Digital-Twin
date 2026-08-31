import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ToastStack from '../components/ui/Toast.jsx';

/**
 * Transient notifications.
 *
 * Exists so that a failed dispatch or a successful disposal produces feedback
 * without a component having to own a piece of error state it will immediately
 * throw away. Errors linger longer than successes: a green "task created" that
 * vanishes is fine, a red "dispatch refused: compartment full" that vanishes
 * before it is read is a bug report waiting to happen.
 */

const ToastContext = createContext(null);

const LIFETIME = { success: 4000, info: 5000, warn: 7000, error: 9000 };

/** Hard cap. Twelve stacked toasts obscure the page they are describing. */
const MAX_VISIBLE = 4;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone, message, detail = null) => {
      if (!message) return null;
      const id = nextId.current++;

      setToasts((current) => {
        const next = [...current, { id, tone, message, detail }];
        // Drop the oldest rather than the newest: the most recent message is the
        // one describing what the operator just did.
        if (next.length <= MAX_VISIBLE) return next;
        const overflow = next.slice(0, next.length - MAX_VISIBLE);
        overflow.forEach((t) => {
          const timer = timers.current.get(t.id);
          if (timer) clearTimeout(timer);
          timers.current.delete(t.id);
        });
        return next.slice(-MAX_VISIBLE);
      });

      timers.current.set(
        id,
        setTimeout(() => dismiss(id), LIFETIME[tone] ?? LIFETIME.info)
      );
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, detail) => push('success', message, detail),
      error: (message, detail) => push('error', message, detail),
      info: (message, detail) => push('info', message, detail),
      warn: (message, detail) => push('warn', message, detail),
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
