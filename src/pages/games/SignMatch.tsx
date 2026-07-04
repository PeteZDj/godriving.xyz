import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { SIGNS } from '../../data/signs';
import { Sign } from '../../components/Sign';
import { GameOver } from '../../components/GameOver';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

type Card =
  | { key: string; pairId: string; kind: 'sign'; signId: string }
  | { key: string; pairId: string; kind: 'name'; label: string };

const PAIRS = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): Card[] {
  const picked = shuffle(SIGNS).slice(0, PAIRS);
  const cards: Card[] = [];
  picked.forEach((s) => {
    cards.push({ key: `${s.id}-sign`, pairId: s.id, kind: 'sign', signId: s.id });
    cards.push({ key: `${s.id}-name`, pairId: s.id, kind: 'name', label: s.name });
  });
  return shuffle(cards);
}

export default function SignMatch() {
  const { refresh } = useAuth();
  const [deck, setDeck] = useState<Card[]>(buildDeck);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const signById = useMemo(() => Object.fromEntries(SIGNS.map((s) => [s.id, s])), []);

  useEffect(() => {
    if (!started || over) return;
    const t = setInterval(() => setTime((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [started, over]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    setMoves((m) => m + 1);
    const [a, b] = flipped;
    const ca = deck.find((c) => c.key === a)!;
    const cb = deck.find((c) => c.key === b)!;
    if (ca.pairId === cb.pairId) {
      setMatched((m) => [...m, ca.pairId]);
      setFlipped([]);
    } else {
      const t = setTimeout(() => setFlipped([]), 800);
      return () => clearTimeout(t);
    }
  }, [flipped, deck]);

  useEffect(() => {
    if (matched.length === PAIRS && started && !over) {
      const score = Math.max(50, 1000 - time * 8 - (moves - PAIRS) * 15);
      finish(score);
    }
  }, [matched, started]);

  async function finish(score: number) {
    setOver(true);
    try {
      const r = await api('/scores', { body: { game: 'match', score, accuracy: Math.round((PAIRS / Math.max(moves, PAIRS)) * 100) } });
      setReward(r);
      refresh();
    } catch { /* not logged / offline */ }
  }

  const click = (key: string) => {
    if (!started) setStarted(true);
    if (over || flipped.length === 2) return;
    const card = deck.find((c) => c.key === key)!;
    if (matched.includes(card.pairId) || flipped.includes(key)) return;
    setFlipped((f) => [...f, key]);
  };

  const reset = () => {
    setDeck(buildDeck());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTime(0);
    setStarted(false);
    setOver(false);
    setReward(null);
  };

  const score = Math.max(50, 1000 - time * 8 - (moves - PAIRS) * 15);

  return (
    <div className="container mx-auto px-4 py-12">
      <Link to="/games" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Back to games
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Sign Match</h1>
          <p className="text-ink/60">Match each sign with its name. Fewer moves &amp; faster = higher score.</p>
        </div>
        <div className="flex gap-3">
          <Stat icon={<Clock className="h-4 w-4" />} label="Time" value={`${time}s`} />
          <Stat icon={<Sparkles className="h-4 w-4" />} label="Moves" value={moves} />
          <Stat label="Score" value={started ? score : 1000} highlight />
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-3 sm:grid-cols-4">
        {deck.map((card) => {
          const isUp = flipped.includes(card.key) || matched.includes(card.pairId);
          const isMatched = matched.includes(card.pairId);
          return (
            <button
              key={card.key}
              onClick={() => click(card.key)}
              className={`relative aspect-square rounded-2xl border-2 p-2 transition-all ${
                isMatched
                  ? 'border-go bg-go/5'
                  : isUp
                  ? 'border-brand bg-white'
                  : 'border-transparent bg-gradient-to-br from-brand to-brand-dark hover:from-brand-dark'
              }`}
            >
              {isUp ? (
                card.kind === 'sign' ? (
                  <Sign sign={signById[card.signId]} className="h-full w-full" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center px-1 text-center text-xs font-semibold leading-tight text-ink sm:text-sm">
                    {card.label}
                  </span>
                )
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-white/90">?</span>
              )}
            </button>
          );
        })}
      </div>

      {over && (
        <GameOver
          title="Matched them all!"
          score={score}
          accuracy={Math.round((PAIRS / Math.max(moves, PAIRS)) * 100)}
          reward={reward}
          onReplay={reset}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value, highlight }: any) {
  return (
    <div className={`rounded-xl px-4 py-2 text-center ${highlight ? 'bg-brand text-white' : 'bg-black/5 text-ink'}`}>
      <div className="flex items-center justify-center gap-1 text-xs opacity-70">{icon}{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
