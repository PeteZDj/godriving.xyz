import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX, Trophy, Zap, Coins, RotateCcw, Home, Gamepad2 } from 'lucide-react';
import { createEngine } from './engine';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export interface DriveGameConfig {
  id: string; // backend score key, e.g. "drive_parking"
  title: string;
  emoji: string;
  intro: string;
  controls: { key: string; label: string }[];
  difficulties?: { id: string; label: string }[];
  createLesson: (engine: any, rt: LessonRuntime) => LessonInstance;
}

export interface LessonInstance {
  start: (difficulty: string) => void;
  destroy?: () => void;
}

export interface LessonRuntime {
  difficulty: string;
  setScore: (n: number) => void;
  setRound: (s: string) => void;
  setBest: (s: string) => void;
  notify: (msg: string, type?: string, dur?: number) => void;
  finish: (result: FinishResult) => void;
}

export interface FinishResult {
  score: number;
  summary?: string;
  stats?: { label: string; value: string | number }[];
}

type Phase = 'intro' | 'playing' | 'ended';

export function DriveGame({ config }: { config: DriveGameConfig }) {
  const { user, refresh } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);
  const lessonRef = useRef<LessonInstance | null>(null);

  const [phase, setPhase] = useState<Phase>('intro');
  const [difficulty, setDifficulty] = useState(config.difficulties?.[1]?.id || config.difficulties?.[0]?.id || 'medium');
  const [muted, setMuted] = useState(false);

  const [hud, setHud] = useState({ speed: 0, gear: 'N', signalLeft: false, signalRight: false });
  const [mission, setMission] = useState({ title: '', desc: '', step: '', progress: 0 });
  const [scoreBox, setScoreBox] = useState({ score: 0, round: '', best: '' });
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [end, setEnd] = useState<FinishResult | null>(null);
  const [reward, setReward] = useState<{ xpGain: number; coinGain: number } | null>(null);
  const toastTimer = useRef<any>(null);

  // Build the engine once on mount.
  useEffect(() => {
    if (!containerRef.current) return;
    const engine = createEngine(containerRef.current);
    engineRef.current = engine;
    engine.setMinimap(miniRef.current);
    engine.setHudCallback((h: any) => {
      if (h.muted != null) { setMuted(h.muted); return; }
      setHud((prev) => ({ ...prev, ...h }));
    });
    engine.setMissionCallback((m: any) => setMission((prev) => ({ ...prev, ...m })));
    engine.setNotifyCallback((msg: string, type = 'info', dur = 1800) => {
      setToast({ msg, type });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), dur);
    });

    const rt: LessonRuntime = {
      get difficulty() { return difficultyRef.current; },
      setScore: (n) => setScoreBox((p) => ({ ...p, score: n })),
      setRound: (s) => setScoreBox((p) => ({ ...p, round: s })),
      setBest: (s) => setScoreBox((p) => ({ ...p, best: s })),
      notify: (msg, type, dur) => engine.notify(msg, type, dur),
      finish: (result) => finishGame(result),
    };
    lessonRef.current = config.createLesson(engine, rt);

    return () => {
      clearTimeout(toastTimer.current);
      try { lessonRef.current?.destroy?.(); } catch {}
      try { engine.destroy(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const difficultyRef = useRef(difficulty);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const finishGame = useCallback(async (result: FinishResult) => {
    setEnd(result);
    setPhase('ended');
    if (userRef.current) {
      try {
        const r = await api<{ xpGain: number; coinGain: number }>('/scores', { body: { game: config.id, score: result.score } });
        setReward(r);
        refresh();
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = () => {
    setEnd(null);
    setReward(null);
    setScoreBox({ score: 0, round: '', best: '' });
    setPhase('playing');
    lessonRef.current?.start(difficulty);
  };

  const toggleMute = () => engineRef.current?.audio.toggleMute();

  // On-screen (touch) controls -> drive engine.keys directly
  const hold = (code: string, down: boolean) => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.keys[code] = down;
  };
  const signal = (side: 'L' | 'R') => {
    const eng = engineRef.current;
    if (!eng) return;
    if (side === 'L') { eng.car.signalLeft = !eng.car.signalLeft; if (eng.car.signalLeft) eng.car.signalRight = false; }
    else { eng.car.signalRight = !eng.car.signalRight; if (eng.car.signalRight) eng.car.signalLeft = false; }
    eng.audio.signalClick();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#3a7d3a] select-none">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-3">
        <Link to="/games" className="flex items-center gap-1.5 rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-black/70">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
        <div className="flex items-center gap-2">
          {phase === 'playing' && (
            <div className="rounded-full bg-black/50 px-4 py-2 text-sm font-bold text-white backdrop-blur">
              {scoreBox.round && <span className="mr-3 text-white/60">Round {scoreBox.round}</span>}
              <span className="text-go">{scoreBox.score}</span> pts
              {scoreBox.best && <span className="ml-3 text-white/60">Best {scoreBox.best}</span>}
            </div>
          )}
          <button onClick={toggleMute} className="rounded-full bg-black/50 p-2.5 text-white backdrop-blur hover:bg-black/70">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mission panel */}
      {phase === 'playing' && mission.title && (
        <div className="absolute left-3 top-16 z-20 max-w-xs rounded-2xl bg-black/55 p-4 text-white backdrop-blur">
          {mission.step && <div className="mb-1 text-xs text-white/70" dangerouslySetInnerHTML={{ __html: mission.step }} />}
          <div className="font-display text-base font-bold">{mission.title}</div>
          {mission.desc && <div className="mt-1 text-xs leading-snug text-white/70">{mission.desc}</div>}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-go transition-all" style={{ width: `${mission.progress}%` }} />
          </div>
        </div>
      )}

      {/* Minimap */}
      <div className={`absolute right-3 top-16 z-20 rounded-2xl bg-black/40 p-1.5 backdrop-blur ${phase === 'playing' ? '' : 'hidden'}`}>
        <canvas ref={miniRef} width={150} height={150} className="rounded-xl" />
      </div>

      {/* Speedometer */}
      {phase === 'playing' && (
        <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-2xl bg-black/55 px-6 py-2 text-center text-white backdrop-blur">
          <div className="flex items-end gap-1">
            <span className="font-display text-3xl font-bold leading-none">{hud.speed}</span>
            <span className="mb-0.5 text-xs text-white/60">km/h</span>
          </div>
          <div className="text-xs text-white/60">
            Gear <span className="font-bold text-white">{hud.gear}</span>
            <span className={`ml-2 ${hud.signalLeft ? 'text-amber-400' : 'text-white/20'}`}>◀</span>
            <span className={`ml-1 ${hud.signalRight ? 'text-amber-400' : 'text-white/20'}`}>▶</span>
          </div>
        </div>
      )}

      {/* Touch controls */}
      {phase === 'playing' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-end justify-between px-4 md:hidden">
          <div className="grid grid-cols-3 gap-1.5">
            <span />
            <TouchBtn label="▲" onDown={() => hold('KeyW', true)} onUp={() => hold('KeyW', false)} />
            <span />
            <TouchBtn label="◀" onDown={() => hold('KeyA', true)} onUp={() => hold('KeyA', false)} />
            <TouchBtn label="▼" onDown={() => hold('KeyS', true)} onUp={() => hold('KeyS', false)} />
            <TouchBtn label="▶" onDown={() => hold('KeyD', true)} onUp={() => hold('KeyD', false)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <TouchBtn label="◀" small onDown={() => signal('L')} onUp={() => {}} />
              <TouchBtn label="▶" small onDown={() => signal('R')} onUp={() => {}} />
            </div>
            <TouchBtn label="BRAKE" wide onDown={() => hold('Space', true)} onUp={() => hold('Space', false)} />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur ${
            toast.type === 'fail' ? 'bg-red-600/90' : toast.type === 'success' ? 'bg-go/90' : 'bg-black/70'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Intro */}
      {phase === 'intro' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-2 text-4xl">{config.emoji}</div>
            <h1 className="font-display text-2xl font-bold text-ink">{config.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">{config.intro}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {config.controls.map((c) => (
                <span key={c.key} className="rounded-lg bg-black/5 px-2.5 py-1 text-xs text-ink/70">
                  <b className="text-ink">{c.key}</b> {c.label}
                </span>
              ))}
            </div>

            {config.difficulties && (
              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/50">Difficulty</div>
                <div className="flex gap-2">
                  {config.difficulties.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                        difficulty === d.id ? 'bg-brand text-white' : 'bg-black/5 text-ink/70 hover:bg-black/10'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={startGame}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark"
            >
              <Gamepad2 className="h-5 w-5" /> Start
            </button>
            {!user && (
              <p className="mt-3 text-center text-xs text-ink/50">
                <Link to="/login" className="font-semibold text-brand hover:underline">Log in</Link> to save your score &amp; earn XP.
              </p>
            )}
            <Link to="/games" className="mt-3 block text-center text-xs text-ink/40 hover:text-brand">← back to all games</Link>
          </div>
        </div>
      )}

      {/* End screen */}
      {phase === 'ended' && end && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-go/10">
              <Trophy className="h-8 w-8 text-go" />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink">Lesson complete!</h2>
            {end.summary && <p className="mt-1 text-sm text-ink/60">{end.summary}</p>}
            <div className="my-5">
              <div className="text-5xl font-bold text-brand">{end.score}</div>
              <div className="text-sm text-ink/50">points</div>
            </div>
            {end.stats && (
              <div className="mb-5 grid grid-cols-3 gap-2">
                {end.stats.map((s) => (
                  <div key={s.label} className="rounded-xl bg-black/5 p-2">
                    <div className="text-lg font-bold text-ink">{s.value}</div>
                    <div className="text-[10px] uppercase tracking-wide text-ink/50">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {reward && (
              <div className="mb-5 flex justify-center gap-6">
                <span className="flex items-center gap-1.5 font-semibold text-brand"><Zap className="h-5 w-5" /> +{reward.xpGain} XP</span>
                <span className="flex items-center gap-1.5 font-semibold text-amber-500"><Coins className="h-5 w-5" /> +{reward.coinGain}</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button onClick={startGame} className="flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark">
                <RotateCcw className="h-5 w-5" /> Play again
              </button>
              <Link to="/games" className="flex items-center justify-center gap-2 rounded-xl bg-black/5 py-3 text-sm font-semibold text-ink/70 hover:bg-black/10">
                <Home className="h-4 w-4" /> All games
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TouchBtn({ label, onDown, onUp, small, wide }: { label: string; onDown: () => void; onUp: () => void; small?: boolean; wide?: boolean }) {
  return (
    <button
      className={`pointer-events-auto flex items-center justify-center rounded-2xl bg-black/50 font-bold text-white backdrop-blur active:bg-brand ${
        wide ? 'h-14 w-full px-6 text-xs' : small ? 'h-11 w-11 text-sm' : 'h-14 w-14 text-xl'
      }`}
      onPointerDown={(e) => { e.preventDefault(); onDown(); }}
      onPointerUp={(e) => { e.preventDefault(); onUp(); }}
      onPointerLeave={() => onUp()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
