import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
import { Mark } from './components/brand/Logo.jsx';
import { Link } from 'lucide-react';

/**
 * Routing.
 *
 * Pages are lazy-loaded, which matters more than usual here: the 3D twin pulls in
 * three.js and drei, and that is most of the bundle. Someone who only ever opens
 * the waste register should never download a renderer.
 */

const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(
  () => import('./pages/Register.jsx')
);
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Scanner = lazy(() => import('./pages/Scanner.jsx'));
const WasteRegister = lazy(() => import('./pages/WasteRegister.jsx'));
const Tasks = lazy(() => import('./pages/Tasks.jsx'));
const Segregation = lazy(() => import('./pages/Segregation.jsx'));
const Fleet = lazy(() => import('./pages/Fleet.jsx'));
const DigitalTwin = lazy(() => import('./pages/DigitalTwin.jsx'));
const HospitalMap = lazy(() => import('./pages/HospitalMap.jsx'));
const Alerts = lazy(() => import('./pages/Alerts.jsx'));
const AuditLog = lazy(() => import('./pages/AuditLog.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const GuidedRun = lazy(() => import('./pages/GuidedRun.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

/**
 * The splash shown while the stored token is verified.
 *
 * A brief branded hold rather than a spinner on white, because on a fast local API
 * this is visible for about 80ms and a flash of unstyled loading state looks like a
 * bug.
 */
function Booting() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
      
      <Mark size={44} className="animate-breathe" />
      <p className="text-xs text-faint">Restoring your session…</p>
    </div>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated, booting } = useAuth();
  const location = useLocation();

  if (booting) return <Booting />;

  // `state.from` so signing in returns the user to the page they asked for. A
  // bookmarked compartment page should not dump them on the dashboard.
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  return children;
}

function RequireRole({ permission, children }) {
  const { can } = useAuth();
  if (!can(permission)) return <Navigate to="/" replace />;
  return children;
}

function LoginRoute() {
  const { isAuthenticated, booting } = useAuth();
  if (booting) return <Booting />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            {/* Outer boundary for the routes that sit outside the shell — login and
                the catch-all. The shell has its own inner boundary so navigating
                between pages keeps the sidebar on screen instead of blanking it. */}
            <Suspense fallback={<Booting />}>
              <Routes>
                <Route path="/login" element={<LoginRoute />} />
                <Route
  path="/register"
  element={<Register />}
/>

                <Route
                  element={
                    <RequireAuth>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="scanner" element={<Scanner />} />
                  <Route path="waste" element={<WasteRegister />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="segregation" element={<Segregation />} />
                  <Route path="fleet" element={<Fleet />} />
                  <Route path="fleet/:robotId" element={<Fleet />} />
                  <Route path="twin" element={<DigitalTwin />} />
                  <Route path="map" element={<HospitalMap />} />
                  <Route path="alerts" element={<Alerts />} />
                  <Route
                    path="audit"
                    element={
                      <RequireRole permission="audit.read">
                        <AuditLog />
                      </RequireRole>
                    }
                  />
                  <Route path="settings" element={<Settings />} />
                  <Route path="demo" element={<GuidedRun />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
