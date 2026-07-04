import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { SIGNS, CATEGORIES, categoryColor, SignCategory } from '../../data/signs';
import { Sign } from '../../components/Sign';

export default function SignLibrary() {
  const [cat, setCat] = useState<SignCategory | 'All'>('All');
  const [flipped, setFlipped] = useState<string | null>(null);

  const list = cat === 'All' ? SIGNS : SIGNS.filter((s) => s.category === cat);

  return (
    <div className="container mx-auto px-4 py-12">
      <Link to="/games" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Back to games
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Road Sign Library</h1>
          <p className="text-ink/60">Tap any sign to reveal its meaning. Study, then test yourself.</p>
        </div>
        <Link to="/games/quiz" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          <Gamepad2 className="h-4 w-4" /> Take the quiz
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {(['All', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              cat === c ? 'bg-brand text-white' : 'bg-black/5 text-ink/70 hover:bg-black/10'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((s) => (
          <button
            key={s.id}
            onClick={() => setFlipped(flipped === s.id ? null : s.id)}
            className="group flex flex-col rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="mx-auto h-28 w-28">
              <Sign sign={s} className="h-full w-full" />
            </div>
            <div className="mt-3">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                style={{ background: categoryColor[s.category] }}
              >
                {s.category}
              </span>
              <h3 className="mt-1.5 text-sm font-semibold text-ink">{s.name}</h3>
              <p className={`mt-1 text-xs leading-snug text-ink/60 transition-all ${flipped === s.id ? 'opacity-100' : 'line-clamp-1 opacity-70'}`}>
                {flipped === s.id ? s.description : 'Tap to reveal meaning'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
