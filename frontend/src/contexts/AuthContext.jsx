import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth as authApi, getToken, setToken, setUnauthorizedHandler } from '../services/api.js';

/**
 * Session state.
 *
 * The token lives in localStorage so a page refresh does not sign the operator
 * out mid-shift. On boot the token is verified against `GET /auth/me` rather than
 * trusted: a JWT sitting in storage may be expired, may have been signed with a
 * secret the server no longer uses, or may belong to a user who has since been
 * removed. Until that round-trip finishes `booting` is true, which is what stops
 * the router from flashing the login screen at an already-authenticated user.
 */

const AuthContext = createContext(null);

/**
 * Who may do what, mirrored from the backend's requireRole guards.
 *
 * This is duplicated on purpose, and the duplication is one-directional: the
 * server is the only thing enforcing these. The copy exists so the UI can hide a
 * button the API would refuse, because offering an action that always fails is
 * worse than not offering it. If the two ever drift, the server wins and the user
 * sees a 403 — which is the safe direction for the drift to fail in.
 */
const ALL = ['admin', 'operator', 'staff'];
const SUPERVISED = ['admin', 'operator'];

export const PERMISSIONS = {
  'robot.dispatch': SUPERVISED,
  'robot.recall': SUPERVISED,
  // Any signed-in person may halt a machine that is about to do the wrong thing.
  'robot.stop': ALL,
  'robot.clearStop': SUPERVISED,
  'task.create': SUPERVISED,
  'task.update': SUPERVISED,
  'compartment.dispose': SUPERVISED,
  'compartment.empty': SUPERVISED,
  'waste.create': ALL,
  'waste.reclassify': ALL,
  'waste.delete': ['admin'],
  'audit.read': ['admin'],
  'hospital.update': ['admin'],
  'user.create': ['admin'],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [booting, setBooting] = useState(Boolean(getToken()));

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setHospital(null);
  }, []);

  // Any 401 from anywhere ends the session. Registered once, here, so that a
  // token expiring while the operator is on the fleet page takes them to the
  // login screen instead of filling the toast stack with failures.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    if (!getToken()) {
      setBooting(false);
      return undefined;
    }

    let cancelled = false;
    authApi
      .me()
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setHospital(data.hospital ?? null);
      })
      .catch(() => {
        // The stored token did not survive verification. Discard it silently —
        // an expired session on first load is routine, not an error worth a toast.
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const { token, user: signedIn } = await authApi.login(email, password);
    setToken(token);
    setUser(signedIn);

    // The login response carries the user but not the hospital, and the shell
    // needs the hospital name and floor plan. Fetching it here keeps the app
    // from rendering a header with a blank facility name.
    try {
      const data = await authApi.me();
      setHospital(data.hospital ?? null);
      setUser(data.user);
    } catch {
      // Signed in successfully; only the hospital lookup failed. Let them in —
      // the pages that need the layout will fetch it themselves.
    }
    return signedIn;
  }, []);

  const value = useMemo(
    () => ({
      user,
      hospital,
      booting,
      isAuthenticated: Boolean(user),
      login,
      logout: clearSession,
      setUser,
      /** True if the signed-in role may perform `action`. Unknown actions deny. */
      can: (action) => Boolean(user && PERMISSIONS[action]?.includes(user.role)),
    }),
    [user, hospital, booting, login, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
