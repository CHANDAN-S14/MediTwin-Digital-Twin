import { useState } from 'react';
import { useLocation, useNavigate ,Link} from 'react-router-dom';

import { ArrowRight, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import Logo from '../components/brand/Logo.jsx';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { ErrorState } from '../components/ui/Feedback.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAction } from '../hooks/useApi.js';
import { CATEGORIES, CATEGORY_META, ROLE_META } from '../lib/constants.js';

/**
 * Sign in.
 *
 * Split layout: the left panel states what the system is, the right takes the
 * credentials. The seeded accounts are listed because this is a prototype nobody
 * has been handed a password for — with the warning attached, because a login
 * screen that lists working credentials must say out loud that it is not a
 * production configuration.
 */

const DEMO_ACCOUNTS = [
  { email: 'admin@meditwin.health', role: 'admin' },
  { email: 'operator@meditwin.health', role: 'operator' },
  { email: 'staff@meditwin.health', role: 'staff' },
];

const DEMO_PASSWORD = 'meditwin2026';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { execute, pending, error } = useAction(
    () => login(email.trim(), password),
    {
      onSuccess: () => {
        // Back to whatever they were trying to reach, or the dashboard.
        const target = location.state?.from?.pathname ?? '/';
        navigate(target, { replace: true });
      },
    }
  );

  const useDemo = (account) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Left: what this is. Hidden below lg — on a phone the form is the point. */}
      <div className="relative hidden w-[46%] shrink-0 overflow-hidden bg-brand-gradient-deep lg:flex lg:flex-col">
        <div
          className="absolute inset-0 opacity-[0.14] bg-grid bg-grid-fade"
          aria-hidden="true"
        />
        <div
          className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-bright/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-brand-cyan/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-1 flex-col justify-between p-12">
          <Logo size="lg" inverted subtitle="Autonomous biomedical waste" />

          <div className="max-w-md">
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-white">
              A digital twin for the waste nobody should have to touch.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              MediTwin pairs an autonomous collection robot with a live software model
              of the ward it works in — routing it, classifying what it finds, and
              recording every item against the Bio-Medical Waste Management Rules 2016.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const meta = CATEGORY_META[category];
                return (
                  <span
                    key={category}
                    className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-inset ring-white/15"
                  >
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: meta.hex }}
                      aria-hidden="true"
                    />
                    {meta.label}
                  </span>
                );
              })}
            </div>
          </div>

          <p className="flex items-center gap-2 text-xs text-white/45">
            <ShieldCheck size={14} aria-hidden="true" />
            Every collection is written to an append-only chain of custody.
          </p>
        </div>
      </div>

      {/* Right: the form. */}
      <div className="flex flex-col gap-7 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="md" subtitle="Digital Twin" />
          </div>

          <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted">
            Use the account your facility administrator issued you.
          </p>

          <form
            className="mt-7 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              execute();
            }}
          >
            <Input
              label="Email"
              type="email"
              icon={Mail}
              autoComplete="username"
              placeholder="you@hospital.health"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              icon={KeyRound}
              autoComplete="current-password"
              placeholder="••••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error ? <ErrorState compact error={error} /> : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={pending}
              iconRight={ArrowRight}
              disabled={!email.trim() || !password}
            >
              {pending ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          {/* <div className="mt-8 rounded-card border border-line bg-surface p-4">
            <p className="text-xs font-medium text-ink">Seeded demo accounts</p>
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted">
              Created by <span className="font-mono">npm run seed</span>. These exist so the
              prototype can be opened without provisioning anyone. Change them before this
              system touches a real network.
            </p>

            <div className="mt-3 space-y-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => useDemo(account)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-brand-wash"
                >
                  <span className="truncate font-mono text-[0.6875rem] text-ink">
                    {account.email}
                  </span>
                  <span className="shrink-0 text-[0.625rem] uppercase tracking-wider text-faint">
                    {ROLE_META[account.role]?.label ?? account.role}
                  </span>
                </button>
              ))}
            </div>
          </div> */}

          <p className="mt-6 text-center text-[0.6875rem] text-faint">
            MediTwin is a research prototype. Its classifier is not certified for
            clinical or regulatory decision-making.
          </p>
        </div>
              <div className="  text-center text-sm text-slate-500 ">
  Don't have a MediTwin account?{' '}

  <Link
    to="/register"
    className="font-semibold text-teal-600 hover:text-teal-700"
  >
    Create account
  </Link>
</div>
      </div>
      {/* <div className=" ml-0 text-center text-sm text-slate-500 ">
  Don't have a MediTwin account?{' '}

  <Link
    to="/register"
    className="font-semibold text-teal-600 hover:text-teal-700"
  >
    Create account
  </Link>
</div> */}
   
    </div>
  );
}
