import { Link } from 'react-router-dom';
import { Gamepad2, Brain, Car, BookOpen, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { LESSONS } from '../game/lessons';

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
        <h1 className="mb-3 font-display text-4xl font-bold text-ink">Play &amp; learn to drive</h1>
        <p className="text-ink/60">
          Every game earns you XP and coins. {user ? 'Keep going to climb the leaderboard!' : 'Log in to save your progress and compete.'}
        </p>
      </div>

      {/* Driving simulator */}
      <div className="mx-auto mt-14 max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/25">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Behind the Wheel</h2>
            <p className="text-sm text-ink/60">A full driving simulator — six interactive lessons, each drilling one test skill. No login needed to play.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LESSONS.map((l) => (
            <Link
              key={l.slug}
              to={`/games/drive/${l.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: l.accent }} />
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: `${l.accent}1a` }}>
                  {l.emoji}
                </div>
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-ink/60">{l.tag}</span>
              </div>
              <h3 className="mb-1.5 font-display text-lg font-bold text-ink">{l.title}</h3>
              <p className="text-sm leading-relaxed text-ink/60">{l.short}</p>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold" style={{ color: l.accent }}>
                Drive <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Sign & quiz games */}
      <div className="mx-auto mt-16 max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-go text-white shadow-lg shadow-go/25">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Signs &amp; Theory</h2>
            <p className="text-sm text-ink/60">Master the highway code and road signs.</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
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
    </div>
  );
}
