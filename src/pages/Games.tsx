import { Link } from 'react-router-dom';
import { Gamepad2, Brain, Car, BookOpen, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';

const games = [
  { to: '/games/signs', icon: BookOpen, color: '#4caf50', title: 'Sign Library', text: 'Browse and study every road sign with meanings. No login needed.', tag: 'Study', free: true },
  { to: '/games/match', icon: Gamepad2, color: '#0071bc', title: 'Sign Match', text: 'Memory match game — pair the sign with its meaning against the clock.', tag: 'Memory' },
  { to: '/games/quiz', icon: Brain, color: '#e6a700', title: 'Highway Code Quiz', text: 'Timed multiple-choice quiz drawn from real driving-test questions.', tag: 'Quiz' },
  { to: '/games/roadrun', icon: Car, color: '#d21e2b', title: 'Road Run', text: 'Arcade driving — dodge traffic and obey the signs to score.', tag: 'Arcade' },
];

export default function Games() {
  const { user } = useAuth();
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-go">The Arcade</div>
        <h1 className="mb-3 font-display text-4xl font-bold text-ink">Play & learn to drive</h1>
        <p className="text-ink/60">
          Every game earns you XP and coins. {user ? 'Keep going to climb the leaderboard!' : 'Log in to save your progress and compete.'}
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
        {games.map((g) => {
          const locked = !g.free && !user;
          return (
            <Link
              key={g.to}
              to={locked ? '/login' : g.to}
              className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: g.color }}>
                <g.icon className="h-7 w-7" />
              </div>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-ink/60">{g.tag}</span>
                {locked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    <Lock className="h-3 w-3" /> Login
                  </span>
                )}
                {g.free && <span className="rounded-full bg-go/10 px-3 py-1 text-xs font-medium text-go-dark">Free</span>}
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-ink">{g.title}</h3>
              <p className="text-sm leading-relaxed text-ink/60">{g.text}</p>
              <div className="mt-5 flex items-center gap-2 font-semibold text-brand">
                {locked ? 'Log in to play' : 'Play now'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
