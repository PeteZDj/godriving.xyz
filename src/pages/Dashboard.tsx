import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Coins, Zap, Target, Gamepad2, TrendingUp, Award } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Stats {
  user: any;
  games: { game: string; best: number; plays: number; avg_accuracy: number | null }[];
  progress: { module: string; completed: boolean; best_score: number }[];
  totalPlays: number;
  globalRank: number;
}

const gameNames: Record<string, string> = {
  match: 'Sign Match',
  quiz: 'Highway Code Quiz',
  roadrun: 'Road Run',
  drive_parking: 'Parking Practice',
  drive_roundabout: 'Roundabout Master',
  drive_lanechange: 'Lane Change Challenge',
  drive_emergency: 'Emergency Stop',
  drive_night: 'Night Drive',
  drive_reverse: 'Three-Point Turn',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/me/stats').then(setStats).catch(() => {});
  }, []);

  const xpInLevel = user ? user.xp % 500 : 0;
  const pct = Math.round((xpInLevel / 500) * 100);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Hi, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-ink/60">Here's your driving-school progress.</p>
        </div>
        <Link to="/games" className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark">
          <Gamepad2 className="h-5 w-5" /> Play a game
        </Link>
      </div>

      {/* Level card */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-8 text-white">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-sm text-white/70">Current level</div>
            <div className="font-display text-5xl font-bold">Level {user?.level}</div>
          </div>
          <div className="flex gap-8">
            <MiniStat icon={Zap} label="XP" value={user?.xp ?? 0} />
            <MiniStat icon={Coins} label="Coins" value={user?.coins ?? 0} />
            <MiniStat icon={Trophy} label="Global Rank" value={stats ? `#${stats.globalRank}` : '—'} />
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-1 flex justify-between text-xs text-white/70">
            <span>{xpInLevel} / 500 XP</span>
            <span>Level {(user?.level ?? 1) + 1}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-go transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card icon={Gamepad2} color="#0071bc" label="Games played" value={stats?.totalPlays ?? 0} />
        <Card icon={Target} color="#4caf50" label="Modules completed" value={stats?.progress.filter((p) => p.completed).length ?? 0} />
        <Card icon={TrendingUp} color="#e6a700" label="Best game score" value={stats?.games.reduce((m, g) => Math.max(m, g.best), 0) ?? 0} />
      </div>

      {/* Per-game breakdown */}
      <h2 className="mb-4 font-display text-xl font-bold text-ink">Your games</h2>
      {stats && stats.games.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {stats.games.map((g) => (
            <div key={g.game} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-brand" />
                <h3 className="font-semibold text-ink">{gameNames[g.game] || g.game}</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-brand">{g.best}</div>
                  <div className="text-xs text-ink/50">Best</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink">{g.plays}</div>
                  <div className="text-xs text-ink/50">Plays</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-go-dark">{g.avg_accuracy ?? '—'}{g.avg_accuracy != null ? '%' : ''}</div>
                  <div className="text-xs text-ink/50">Accuracy</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center">
          <p className="mb-4 text-ink/60">You haven't played any games yet.</p>
          <Link to="/games" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white">
            <Gamepad2 className="h-5 w-5" /> Play your first game
          </Link>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: any) {
  return (
    <div className="text-center">
      <Icon className="mx-auto mb-1 h-5 w-5 text-white/80" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/70">{label}</div>
    </div>
  );
}

function Card({ icon: Icon, color, label, value }: any) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: color }}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-ink">{value}</div>
        <div className="text-sm text-ink/60">{label}</div>
      </div>
    </div>
  );
}
