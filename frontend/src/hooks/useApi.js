import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fetches once and re-fetches on demand.
 *
 * Every page in this app has the same three states — loading, failed, loaded —
 * and writing them out by hand fourteen times produces fourteen slightly
 * different behaviours. This gives them one.
 *
 * The two details that matter:
 *
 * `reload({ silent: true })` refreshes without clearing `data` or raising
 * `loading`. A live dashboard that blanks to a spinner every few seconds is
 * unreadable, so polled refreshes are silent and only a first load or an explicit
 * user action shows the spinner.
 *
 * A response that arrives after the component unmounted, or after a newer request
 * was issued, is dropped. Without the sequence check a slow first request can
 * land after a fast second one and overwrite fresh data with stale data — the kind
 * of bug that only shows up on a bad connection.
 *
 * @param fetcher  () => Promise<T>
 * @param deps     re-runs when these change, like useEffect
 * @param options  { enabled, pollMs, initialData }
 */
export function useApi(fetcher, deps = [], options = {}) {
  const { enabled = true, pollMs = 0, initialData = null } = options;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const alive = useRef(true);
  const sequence = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++sequence.current;
    if (!silent) setLoading(true);

    try {
      const result = await fetcherRef.current();
      if (!alive.current || id !== sequence.current) return undefined;
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      if (!alive.current || id !== sequence.current) return undefined;
      // A silent poll that fails leaves the last good data on screen and records
      // the error, so the page shows stale-but-real numbers with a warning rather
      // than an empty state.
      setError(err.message ?? 'Something went wrong');
      return undefined;
    } finally {
      if (alive.current && id === sequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    run();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  useEffect(() => {
    if (!enabled || !pollMs) return undefined;

    const id = setInterval(() => {
      // Polling a hidden tab burns the user's battery and their rate limit to
      // update pixels nobody is looking at.
      if (document.visibilityState === 'visible') run({ silent: true });
    }, pollMs);

    return () => clearInterval(id);
  }, [enabled, pollMs, run]);

  return {
    data,
    error,
    loading,
    /** True only on the very first load, when there is nothing to show yet. */
    initialising: loading && data === null,
    reload: run,
    setData,
  };
}

/**
 * Runs a one-shot mutation — dispatch a robot, empty a compartment, sign in.
 *
 * Tracks `pending` so a button can disable itself, and guarantees the action
 * cannot be fired twice concurrently. Double-dispatching a robot because someone
 * double-clicked is not a theoretical problem.
 */
export function useAction(action, { onSuccess, onError } = {}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const actionRef = useRef(action);
  actionRef.current = action;
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setPending(true);
    setError(null);

    try {
      const result = await actionRef.current(...args);
      successRef.current?.(result);
      return result;
    } catch (err) {
      const message = err.message ?? 'Something went wrong';
      if (alive.current) setError(message);
      errorRef.current?.(message);
      return undefined;
    } finally {
      inFlight.current = false;
      if (alive.current) setPending(false);
    }
  }, []);

  return { execute, pending, error, reset: () => setError(null) };
}

/**
 * Delays a value until it stops changing, for search inputs.
 * Without it, typing "syringe" fires seven requests and the fourth may answer last.
 */
export function useDebounced(value, delay = 300) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return settled;
}
