import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import Logo from '../brand/Logo.jsx';
import { DEMO_ITEM, NAV_GROUPS } from '../../lib/nav.js';
import { CATEGORIES, CATEGORY_META, ROLE_META } from '../../lib/constants.js';
import { initials } from '../../lib/format.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { IconButton } from '../ui/Button.jsx';
import { useNavigate } from "react-router-dom";

/**
 * Left navigation.
 *
 * Fixed 260px, white, hairline right edge. The colour key at the bottom is not
 * decoration: it is the Schedule I code, and having it permanently on screen means
 * nobody has to remember whether glass sharps are blue or red while looking at a
 * screen full of both.
 */

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={item.blurb}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium transition',
          isActive
            ? 'bg-brand text-white shadow-brand-glow'
            : 'text-muted hover:bg-subtle hover:text-ink'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={16}
            aria-hidden="true"
            className={clsx('shrink-0 transition', isActive ? 'text-white' : 'text-faint group-hover:text-brand')}
          />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }) {
  const { user, hospital, logout, can } = useAuth();
  const role = ROLE_META[user?.role] ?? { label: user?.role ?? '—' };
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      
      <div onClick={() => navigate("")} className="flex h-16 shrink-0 items-center px-5 cursor-pointer">
        <Logo size="sm" subtitle="Digital Twin" />
      </div>

      <nav className="scroll-slim flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => !item.permission || can(item.permission));
          if (visible.length === 0) return null;

          return (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-faint">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visible.map((item) => (
                  <NavItem key={item.to} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}

        <div className="mb-5 border-t border-line pt-4">
          <NavItem item={DEMO_ITEM} onNavigate={onNavigate} />
        </div>

        {/* The regulatory key, always visible. */}
        <div className="rounded-lg border border-line bg-canvas p-3">
          <p className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-faint">
            BMW Rules 2016
          </p>
          <ul className="space-y-1.5">
            {CATEGORIES.map((category) => {
              const meta = CATEGORY_META[category];
              return (
                <li key={category} className="flex items-center gap-2" title={meta.treatment}>
                  <span className={clsx('h-2 w-2 shrink-0 rounded-sm', meta.dot)} />
                  <span className="truncate text-[0.6875rem] text-muted">{meta.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-wash text-xs font-semibold text-brand-deep ring-1 ring-brand-edge">
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink">{user?.name ?? '—'}</p>
            <p className="truncate text-[0.6875rem] text-faint">
              {role.label}
              {hospital?.name ? ` · ${hospital.name}` : ''}
            </p>
          </div>
          <IconButton icon={LogOut} label="Sign out" size="sm" onClick={logout} />
        </div>
      </div>
    </div>
  );
}
