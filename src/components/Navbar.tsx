import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu, X, Trophy, Gamepad2, LogOut, LayoutDashboard, Settings,
  Coins, ChevronDown, GraduationCap,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { flagFor } from '../lib/flag';
import { Logo } from './Logo';

const links = [
  { to: '/games', label: 'Games' },
  { to: '/schools', label: 'Driving Schools' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/partner', label: 'Partner With Us' },
];

function Avatar({ name, avatar, size = 'h-9 w-9' }: { name: string; avatar?: string; size?: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (avatar) {
    return <img src={avatar} alt={name} className={`${size} rounded-full object-cover`} referrerPolicy="no-referrer" />;
  }
  return (
    <span className={`${size} grid place-items-center rounded-full bg-gradient-to-br from-brand to-go text-xs font-bold text-white`}>
      {initials || 'GD'}
    </span>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-black/10 py-1 pl-1 pr-2 transition-colors hover:border-brand/30 hover:bg-brand/5"
        aria-label="Account menu"
      >
        <span className="relative">
          <Avatar name={user.name} avatar={user.avatar} />
          <span className="absolute -bottom-1 -right-1 text-sm leading-none drop-shadow-sm">{flagFor(user.country)}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-ink/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl shadow-black/10">
          <div className="flex items-center gap-3 border-b border-black/5 bg-brand/5 p-4">
            <Avatar name={user.name} avatar={user.avatar} size="h-11 w-11" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate font-semibold text-ink">
                {user.name} <span>{flagFor(user.country)}</span>
              </div>
              <div className="truncate text-xs text-ink/50">{user.email}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-black/5 text-center">
            <div className="bg-white py-2.5">
              <div className="text-sm font-bold text-brand">{user.xp}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink/40">XP</div>
            </div>
            <div className="bg-white py-2.5">
              <div className="text-sm font-bold text-go-dark">Lv{user.level}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink/40">Level</div>
            </div>
            <div className="bg-white py-2.5">
              <div className="text-sm font-bold text-amber-500">{user.coins}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink/40">Coins</div>
            </div>
          </div>

          <div className="p-1.5">
            <MenuLink to="/dashboard" icon={LayoutDashboard} label="My dashboard" onGo={() => setOpen(false)} />
            <MenuLink to="/games" icon={Gamepad2} label="Play games" onGo={() => setOpen(false)} />
            {user.role === 'school' && (
              <MenuLink to="/school" icon={GraduationCap} label="School dashboard" onGo={() => setOpen(false)} />
            )}
            <MenuLink to="/settings" icon={Settings} label="Settings" onGo={() => setOpen(false)} />
            <button
              onClick={() => {
                logout();
                setOpen(false);
                nav('/');
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-ink/70 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, icon: Icon, label, onGo }: { to: string; icon: any; label: string; onGo: () => void }) {
  return (
    <Link
      to={to}
      onClick={onGo}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/80 hover:bg-brand/5 hover:text-brand"
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}

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

        <div className="hidden items-center gap-2 md:flex">
          <NavLink
            to="/settings"
            aria-label="Game settings"
            title="Game settings"
            className={({ isActive }) =>
              `grid h-9 w-9 place-items-center rounded-full transition-colors ${
                isActive ? 'bg-brand/10 text-brand' : 'text-ink/60 hover:bg-black/5 hover:text-brand'
              }`
            }
          >
            <Settings className="h-5 w-5" />
          </NavLink>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/15"
                title="Your XP and level"
              >
                <Trophy className="h-4 w-4" /> {user.xp} XP
                <span className="text-brand/60">· Lv{user.level}</span>
              </Link>
              <span
                className="flex items-center gap-1 rounded-full bg-amber-400/10 px-3 py-1.5 text-sm font-semibold text-amber-600"
                title="Coins earned"
              >
                <Coins className="h-4 w-4" /> {user.coins}
              </span>
              <ProfileMenu />
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
          {user && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-brand/5 p-3">
              <span className="relative">
                <Avatar name={user.name} avatar={user.avatar} size="h-11 w-11" />
                <span className="absolute -bottom-1 -right-1 text-sm leading-none">{flagFor(user.country)}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{user.name}</div>
                <div className="flex items-center gap-2 text-xs text-ink/50">
                  <span className="inline-flex items-center gap-1 font-semibold text-brand"><Trophy className="h-3 w-3" />{user.xp} XP</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600"><Coins className="h-3 w-3" />{user.coins}</span>
                  <span className="text-ink/40">Lv{user.level}</span>
                </div>
              </div>
            </div>
          )}
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
            <NavLink
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink/80 hover:bg-brand/5"
            >
              <Settings className="h-4 w-4" /> Game Settings
            </NavLink>
            <div className="my-2 h-px bg-black/5" />
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-brand">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                {user.role === 'school' && (
                  <Link to="/school" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-brand">
                    <GraduationCap className="h-4 w-4" /> School dashboard
                  </Link>
                )}
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
                  <LogOut className="h-4 w-4" /> Sign out
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
