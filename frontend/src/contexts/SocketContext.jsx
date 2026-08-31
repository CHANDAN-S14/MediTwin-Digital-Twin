import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

/**
 * The live channel.
 *
 * One socket for the whole app. Every page that wants telemetry subscribes
 * through this context rather than opening its own connection, because eight
 * pages each with their own socket means eight JWT handshakes, eight rooms and
 * eight copies of the same robot position — and a fleet view that disagrees with
 * the map on the next tab.
 *
 * The server also keeps a running robot state, so this context deliberately holds
 * only a *projection*: whatever the last tick said. It is not a cache to be
 * trusted after a reconnect, which is why the fleet and map pages re-fetch over
 * REST when `connected` flips back to true.
 */

export const EVENTS = {
  ROBOT_LOCATION: 'robot:location',
  ROBOT_STATUS: 'robot:status',
  ROBOT_BATTERY: 'robot:battery',
  WASTE_DETECTED: 'waste:detected',
  WASTE_CLASSIFIED: 'waste:classified',
  WASTE_COLLECTED: 'waste:collected',
  COMPARTMENT_UPDATED: 'compartment:updated',
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_COMPLETED: 'task:completed',
  ALERT_RAISED: 'alert:raised',
};

/** Live events the shell surfaces as a badge. Older ones fall off the end. */
const MAX_LIVE_ALERTS = 20;

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [handshakeError, setHandshakeError] = useState(null);

  /** robotId → the latest known state, merged across the three robot events. */
  const [robots, setRobots] = useState({});
  const [liveAlerts, setLiveAlerts] = useState([]);

  /**
   * Counts every tick received, so a component can depend on "something moved"
   * without depending on a deep object it would then have to diff.
   */
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setConnected(false);
      setRobots({});
      return undefined;
    }

    const token = getToken();
    if (!token) return undefined;

    // Same origin in development so Vite's proxy handles the upgrade; an explicit
    // URL only when the API is deployed elsewhere.
    const url = import.meta.env.VITE_API_URL || undefined;
    const next = io(url, {
      auth: { token },
      // Poll first, then upgrade. Going websocket-only fails outright behind
      // proxies that do not pass the upgrade header, and failing closed on a
      // dashboard is worse than a slightly slower first connection.
      transports: ['polling', 'websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 10000,
    });

    next.on('connect', () => {
      setConnected(true);
      setHandshakeError(null);
    });
    next.on('disconnect', () => setConnected(false));
    next.on('connect_error', (err) => {
      setConnected(false);
      setHandshakeError(err?.message ?? 'Connection refused');
    });

    const mergeRobot = (id, patch) => {
      if (!id) return;
      setRobots((current) => ({ ...current, [id]: { ...current[id], ...patch, robotId: id } }));
      setTick((n) => n + 1);
    };

    /*
     * These three shapes are the server's, verbatim — see robotSimulator.js.
     *
     * The field is `status`, not `state`, and it is `status` in the Robot model, in
     * GET /robots and in these events. Renaming it here would mean every consumer
     * has to know which of the two names applies to the object it happens to be
     * holding, so the projection keeps the server's name.
     */

    // { robotId, location: {x,y}, progress, leg, battery }
    next.on(EVENTS.ROBOT_LOCATION, (p) =>
      mergeRobot(p.robotId, {
        location: p.location,
        progress: p.progress,
        leg: p.leg,
        battery: p.battery,
      })
    );

    // { robotId, status, note, taskId, at }
    next.on(EVENTS.ROBOT_STATUS, (p) =>
      mergeRobot(p.robotId, {
        status: p.status,
        note: p.note,
        currentTaskId: p.taskId ?? null,
        statusAt: p.at,
      })
    );

    // { robotId, battery }
    next.on(EVENTS.ROBOT_BATTERY, (p) => mergeRobot(p.robotId, { battery: p.battery }));

    next.on(EVENTS.ALERT_RAISED, (alert) => {
      setLiveAlerts((current) => [alert, ...current].slice(0, MAX_LIVE_ALERTS));
    });

    setSocket(next);

    return () => {
      next.removeAllListeners();
      next.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated]);

  /**
   * Subscribes to one event for the lifetime of a component.
   *
   * Returns an unsubscribe function. Kept stable across renders so callers can
   * depend on it in an effect without resubscribing every tick.
   */
  const subscribe = useCallback(
    (event, handler) => {
      if (!socket) return () => {};
      socket.on(event, handler);
      return () => socket.off(event, handler);
    },
    [socket]
  );

  /** Primes the projection from a REST fetch, so the map draws before tick one. */
  const seedRobots = useCallback((list) => {
    if (!Array.isArray(list)) return;
    setRobots((current) => {
      const next = { ...current };
      list.forEach((robot) => {
        if (robot?.robotId) next[robot.robotId] = { ...robot, ...next[robot.robotId] };
      });
      return next;
    });
  }, []);

  const clearLiveAlerts = useCallback(() => setLiveAlerts([]), []);

  const value = useMemo(
    () => ({
      socket,
      connected,
      handshakeError,
      robots,
      robotList: Object.values(robots),
      tick,
      liveAlerts,
      subscribe,
      seedRobots,
      clearLiveAlerts,
    }),
    [socket, connected, handshakeError, robots, tick, liveAlerts, subscribe, seedRobots, clearLiveAlerts]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used inside <SocketProvider>');
  return context;
}

/**
 * Subscribes to a socket event without the caller managing cleanup.
 *
 * The handler is held in a ref so that an inline arrow function — which is a new
 * value on every render — does not tear down and rebuild the listener sixty times
 * a second.
 */
export function useSocketEvent(event, handler) {
  const { subscribe } = useSocket();
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!event) return undefined;
    return subscribe(event, (...args) => ref.current?.(...args));
  }, [event, subscribe]);
}
