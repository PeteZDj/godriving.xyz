import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Trophy, Gamepad2, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Logo } from './Logo';

const links = [
  { to: '/games', label: 'Games' },
  { to: '/schools', label: 'Driving Schools' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/partner', label: 'Partner With Us' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand/10 text-brand' : 'text-ink/70 hover:text-brand'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/15"
              >
                <Trophy className="h-4 w-4" /> {user.xp} XP · Lv{user.level}
              </Link>
              <button
                onClick={() => {
                  logout();
                  nav('/');
                }}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink/60 hover:text-brand"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-ink/70 hover:text-brand">
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-transform hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-black/5 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink/80 hover:bg-brand/5"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="my-2 h-px bg-black/5" />
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-brand">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link to="/games" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-brand">
                  <Gamepad2 className="h-4 w-4" /> Play Games
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                    nav('/');
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-ink/70"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
