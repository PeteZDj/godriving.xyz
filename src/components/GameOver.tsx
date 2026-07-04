import { Link } from 'react-router-dom';
import { RotateCcw, Trophy, Coins, Zap, Home } from 'lucide-react';

interface Props {
  title?: string;
  score: number;
  accuracy?: number;
  reward?: { xpGain: number; coinGain: number } | null;
  onReplay: () => void;
}

export function GameOver({ title = 'Round complete!', score, accuracy, reward, onReplay }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-go/10">
          <Trophy className="h-8 w-8 text-go" />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
        <div className="my-6">
          <div className="text-5xl font-bold text-brand">{score}</div>
          <div className="text-sm text-ink/50">points{accuracy != null ? ` · ${accuracy}% accuracy` : ''}</div>
        </div>

        {reward && (
          <div className="mb-6 flex justify-center gap-6">
            <span className="flex items-center gap-1.5 font-semibold text-brand">
              <Zap className="h-5 w-5" /> +{reward.xpGain} XP
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-500">
              <Coins className="h-5 w-5" /> +{reward.coinGain}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button onClick={onReplay} className="flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark">
            <RotateCcw className="h-5 w-5" /> Play again
          </button>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/games" className="flex items-center justify-center gap-2 rounded-xl bg-black/5 py-3 text-sm font-semibold text-ink/70 hover:bg-black/10">
              <Home className="h-4 w-4" /> Games
            </Link>
            <Link to="/leaderboard" className="flex items-center justify-center gap-2 rounded-xl bg-black/5 py-3 text-sm font-semibold text-ink/70 hover:bg-black/10">
              <Trophy className="h-4 w-4" /> Ranks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
