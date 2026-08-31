import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import { Loading } from '../ui/Feedback.jsx';
import { IconButton } from '../ui/Button.jsx';

/**
 * The application frame.
 *
 * Fixed sidebar, sticky header, scrolling content. On narrow screens the sidebar
 * becomes an overlay drawer — this is a control room product and the dense tables
 * genuinely want a desktop, but a ward nurse checking a compartment level on a
 * phone should not meet a broken layout.
 */

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the drawer on navigation. Leaving it open over the page the user just
  // asked for means they have to dismiss it before seeing anything.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Scroll to the top on route change. Browsers restore scroll position, which on
  // a single-page app means arriving at the middle of a page you have not seen.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop: a real column in the layout. */}
      <div className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </div>

      {/* Mobile: an overlay drawer. */}
      <div
        className={clsx(
          'fixed inset-0 z-40 lg:hidden',
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!drawerOpen}
      >
        <div
          className={clsx(
            'absolute inset-0 bg-ink/30 transition-opacity duration-200',
            drawerOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={clsx(
            'absolute inset-y-0 left-0 w-64 shadow-pop transition-transform duration-200 ease-out',
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
          <IconButton
            icon={X}
            label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute right-2 top-3.5"
          />
        </div>
      </div>

      <div className="lg:pl-64">
        <TopBar onOpenSidebar={() => setDrawerOpen(true)} />
        <main className="px-4 pb-10 pt-5 sm:px-6">
          {/* Every page below is lazy-loaded, so the shell needs a fallback. */}
          <Suspense fallback={<Loading height="h-[60vh]" label="Loading page" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/**
 * Standard page wrapper: a heading block plus content, with a consistent max width.
 *
 * 96rem because the waste register has nine columns and the 3D viewport wants
 * room; below that the tables start scrolling horizontally on a laptop.
 */
export function Page({ title, description, actions, children, className }) {
  return (
    <div className={clsx('mx-auto w-full max-w-[96rem]', className)}>
      {title || actions ? (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
