import { Link } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, Gamepad2 } from 'lucide-react';
import { GameSettings } from '../components/GameSettings';

export default function Settings() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-lg">
        <Link to="/games" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> Back to games
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <SlidersHorizontal className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">Game settings</h1>
          <p className="mt-2 text-ink/60">Tune the controls to your device. Saved on this browser.</p>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-7 shadow-sm">
          <GameSettings />
        </div>

        <Link
          to="/games"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark"
        >
          <Gamepad2 className="h-5 w-5" /> Play games
        </Link>
      </div>
    </div>
  );
}
