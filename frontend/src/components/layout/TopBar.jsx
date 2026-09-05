import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Bell, Menu, Wifi, WifiOff } from 'lucide-react';
import { navItemFor } from '../../lib/nav.js';
import { useSocket } from '../../contexts/SocketContext.jsx';
import { IconButton } from '../ui/Button.jsx';
import { LiveDot } from '../ui/Badge.jsx';

/**
 * Page header.
 *
 * Carries the connection state, because every number below it is only as current as
 * the socket. When the socket drops, this is the one place that says so — an
 * operator reading a stale battery percentage without knowing it is stale is the
 * failure mode this strip exists to prevent.
 */

export default function TopBar({ onOpenSidebar }) {
  const { pathname } = useLocation();
  const { connected, liveAlerts } = useSocket();
  const item = navItemFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
      <IconButton
        icon={Menu}
        label="Open navigation"
        onClick={onOpenSidebar}
        className="lg:hidden"
      />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
          {item?.label ?? 'MediTwin'}
        </h1>
        {item?.blurb ? <p className="truncate text-xs text-muted">{item.blurb}</p> : null}
      </div>

      <div
        className={clsx(
          'hidden items-center gap-2 rounded-pill border px-2.5 py-1 sm:flex',
          connected ? 'border-state-ok/25 bg-state-ok-tint' : 'border-state-ok/25 bg-state-ok-tint'
        )}
        title={
          connected
            ? 'Receiving live telemetry'
            : 'Not connected — the figures on this page may be out of date'
        }
      >
        {connected ? (
          <>
            <LiveDot live tone="ok" />
            <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-emerald-800">
              Live
            </span>
            <Wifi size={13} className="text-emerald-700" aria-hidden="true" />
          </>
        ) : (
          <>
            <LiveDot live={false} />
            <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-emerald-800">
              Live
            </span>
            <Wifi size={13} className="text-emerald-700" aria-hidden="true" />
          </>
        )}
      </div>

      <Link
        to="/alerts"
        aria-label={
          liveAlerts.length
            ? `Alerts — ${liveAlerts.length} raised since you signed in`
            : 'Alerts'
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <Bell size={17} aria-hidden="true" />
        {liveAlerts.length > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-state-danger px-1 text-[0.5625rem] font-semibold text-white">
            {liveAlerts.length > 9 ? '9+' : liveAlerts.length}
          </span>
        ) : null}
      </Link>
    </header>
  );
}
