import { useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { api } from '../lib/api';

interface Row {
  name: string;
  city?: string;
  country?: string;
  score: number;
  level?: number;
}

const tabs = [
  { key: '', label: 'Overall XP' },
  { key: 'match', label: 'Sign Match' },
  { key: 'quiz', label: 'Highway Quiz' },
  { key: 'roadrun', label: 'Road Run' },
];

export default function Leaderboard() {
  const [tab, setTab] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const qs = tab ? `?game=${tab}` : '';
    api<{ leaderboard: Row[] }>(`/leaderboard${qs}`).then((d) => setRows(d.leaderboard)).catch(() => setRows([]));
  }, [tab]);

  const medal = (i: number) =>
    i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-ink/30';

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-go">
          <Trophy className="h-4 w-4" /> Hall of Fame
        </div>
        <h1 className="mb-3 font-display text-4xl font-bold text-ink">Leaderboard</h1>
        <p className="text-ink/60">The sharpest drivers on GoDriving. Play more to climb the ranks.</p>
      </div>

      <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key || 'all'}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-brand text-white' : 'bg-black/5 text-ink/70 hover:bg-black/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        {rows.length === 0 && <div className="p-10 text-center text-ink/50">No scores yet. Be the first!</div>}
        {rows.map((r, i) => (
          <div key={i} className={`flex items-center gap-4 border-b border-black/5 px-5 py-4 last:border-0 ${i < 3 ? 'bg-brand/[0.03]' : ''}`}>
            <div className="w-8 text-center">
              {i < 3 ? <Medal className={`mx-auto h-6 w-6 ${medal(i)}`} /> : <span className="font-semibold text-ink/40">{i + 1}</span>}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 font-bold text-brand">
              {r.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-ink">{r.name}</div>
              {(r.city || r.country) && <div className="text-xs text-ink/50">{[r.city, r.country].filter(Boolean).join(', ')}</div>}
            </div>
            {r.level != null && <span className="rounded-full bg-go/10 px-2.5 py-1 text-xs font-medium text-go-dark">Lv {r.level}</span>}
            <div className="w-20 text-right font-bold text-brand">{r.score.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
