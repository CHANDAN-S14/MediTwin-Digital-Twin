import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Map,
  ScanLine,
  ScrollText,
  Settings,
  Split,
  Trash2,
} from 'lucide-react';

/**
 * The sidebar.
 *
 * Grouped by what a person is doing rather than by which service owns the data.
 * "Operations" is the shift work — scan, log, dispatch, segregate. "Fleet" is
 * watching the machines. "Records" is what a regulator or an administrator opens.
 * That ordering follows how often each is used, which is why Dashboard is first and
 * Settings is last.
 *
 * `permission` hides an entry the API would refuse. Audit is the only genuinely
 * gated route — ward staff should not see the sidebar advertise a page that returns
 * 403.
 */

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      {
        to: '/',
        label: 'Dashboard',
        icon: LayoutDashboard,
        end: true,
        blurb: 'Live fleet, today’s totals and open alerts',
      },
      {
        to: '/analytics',
        label: 'Analytics',
        icon: BarChart3,
        blurb: 'Volume trends, department breakdown, classifier accuracy',
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        to: '/scanner',
        label: 'AI Scanner',
        icon: ScanLine,
        blurb: 'Classify an item and log it to the register',
      },
      {
        to: '/waste',
        label: 'Waste Management',
        icon: Trash2,
        blurb: 'The full waste register with export',
      },
      {
        to: '/tasks',
        label: 'Collection Tasks',
        icon: ClipboardList,
        blurb: 'Queued, active and completed collection runs',
      },
      {
        to: '/segregation',
        label: 'Segregation',
        icon: Split,
        blurb: 'Compartment fill levels and disposal handover',
      },
    ],
  },
  {
    label: 'Fleet',
    items: [
      {
        to: '/fleet',
        label: 'Robot Fleet',
        icon: Bot,
        blurb: 'Every robot, its state, battery and current task',
      },
      {
        to: '/twin',
        label: '3D Digital Twin',
        icon: Boxes,
        blurb: 'The live 3D model of robot and ward',
      },
      {
        to: '/map',
        label: 'Hospital Map',
        icon: Map,
        blurb: 'Occupancy grid, departments and planned routes',
      },
    ],
  },
  {
    label: 'Records',
    items: [
      {
        to: '/alerts',
        label: 'Alerts',
        icon: Bell,
        blurb: 'Everything the system wants a human to look at',
      },
      {
        to: '/audit',
        label: 'Audit Log',
        icon: ScrollText,
        permission: 'audit.read',
        blurb: 'Append-only chain of custody',
      },
      {
        to: '/settings',
        label: 'Settings',
        icon: Settings,
        blurb: 'Profile, password, facility and service health',
      },
    ],
  },
];

/** Flattened, for the page-title lookup in the header. */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export const navItemFor = (pathname) => {
  if (pathname === '/') return NAV_ITEMS[0];
  // Longest match wins, so /waste/WM-0001 still resolves to the Waste entry.
  return NAV_ITEMS.filter((item) => item.to !== '/' && pathname.startsWith(item.to)).sort(
    (a, b) => b.to.length - a.to.length
  )[0];
};

export const DEMO_ITEM = {
  to: '/demo',
  label: 'Guided Run',
  icon: Activity,
  blurb: 'Walk one collection end to end, narrated',
};
