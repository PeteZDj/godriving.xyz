import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { GameOver } from '../../components/GameOver';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { usePrefs, shouldShowControls, vibrate } from '../../lib/prefs';

const LANES = 3;
const W = 360;
const H = 560;

interface Obstacle { lane: number; y: number; type: 'car' | 'coin'; color: string }

export default function RoadRun() {
  const { refresh } = useAuth();
  const { prefs } = usePrefs();
  const showTouch = shouldShowControls(prefs.controls);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [reward, setReward] = useState<any>(null);

  // mutable game state kept in refs so the RAF loop stays stable
  const state = useRef({
    lane: 1,
    obstacles: [] as Obstacle[],
    speed: 3,
    dist: 0,
    coins: 0,
    spawnT: 0,
    dash: 0,
    raf: 0,
    alive: true,
    score: 0,
  });

  const move = (dir: -1 | 1) => {
    const s = state.current;
    const next = Math.max(0, Math.min(LANES - 1, s.lane + dir));
    if (next !== s.lane) vibrate(prefs.haptics);
    s.lane = next;
  };

  // Crisp rendering on high-DPI screens: scale the backing store by devicePixelRatio.
  function setupCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const d = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(W * d);
    canvas.height = Math.round(H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  // Tap the left/right half of the track to change lanes.
  const tapSteer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!state.current.alive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    move(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') move(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function start() {
    const s = state.current;
    s.lane = 1; s.obstacles = []; s.speed = 3; s.dist = 0; s.coins = 0;
    s.spawnT = 0; s.dash = 0; s.alive = true; s.score = 0;
    setScore(0); setReward(null); setOver(false); setRunning(true);
    setupCanvas();
    loop();
  }

  function endGame() {
    const s = state.current;
    s.alive = false;
    cancelAnimationFrame(s.raf);
    setRunning(false);
    setOver(true);
    finish(s.score);
  }

  async function finish(finalScore: number) {
    try {
      const r = await api('/scores', { body: { game: 'roadrun', score: finalScore, meta: { coins: state.current.coins } } });
      setReward(r);
      refresh();
    } catch { /* ignore */ }
  }

  function loop() {
    const s = state.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const laneW = W / LANES;
    const carW = laneW * 0.56;
    const carH = 92;
    const carY = H - carH - 20;

    s.dist += s.speed;
    s.score = Math.floor(s.dist / 10) + s.coins * 25;
    s.speed = 3 + s.dist / 2200;
    s.dash += s.speed;

    // spawn
    s.spawnT -= 1;
    if (s.spawnT <= 0) {
      const lane = Math.floor(Math.random() * LANES);
      const isCoin = Math.random() < 0.35;
      s.obstacles.push({
        lane,
        y: -100,
        type: isCoin ? 'coin' : 'car',
        color: ['#d21e2b', '#e6a700', '#4caf50', '#0071bc'][Math.floor(Math.random() * 4)],
      });
      s.spawnT = Math.max(28, 70 - s.dist / 400);
    }

    // move + collide
    const playerCx = s.lane * laneW + laneW / 2;
    for (const o of s.obstacles) {
      o.y += s.speed;
      const ocx = o.lane * laneW + laneW / 2;
      if (o.lane === s.lane && o.y + 40 > carY && o.y < carY + carH) {
        if (o.type === 'coin' && o.y > -50) {
          o.y = H + 999; // consume
          s.coins += 1;
        } else if (o.type === 'car') {
          endGame();
          return;
        }
      }
      void ocx; void playerCx;
    }
    s.obstacles = s.obstacles.filter((o) => o.y < H + 60);

    // ---- draw ----
    ctx.fillStyle = '#39424e';
    ctx.fillRect(0, 0, W, H);
    // grass edges
    ctx.fillStyle = '#2f7d32';
    ctx.fillRect(0, 0, 8, H);
    ctx.fillRect(W - 8, 0, 8, H);
    // lane dashes
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 26]);
    for (let i = 1; i < LANES; i++) {
      ctx.beginPath();
      ctx.lineDashOffset = -(s.dash % 52);
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // obstacles
    for (const o of s.obstacles) {
      const cx = o.lane * laneW + laneW / 2;
      if (o.type === 'coin') {
        ctx.fillStyle = '#ffcf33';
        ctx.beginPath();
        ctx.arc(cx, o.y + 20, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c99700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('$', cx, o.y + 26);
      } else {
        drawCar(ctx, cx - carW / 2, o.y, carW, carH, o.color);
      }
    }

    // player car
    drawCar(ctx, playerCx - carW / 2, carY, carW, carH, '#0071bc', true);

    setScore(s.score);
    if (s.alive) s.raf = requestAnimationFrame(loop);
  }

  useEffect(() => () => cancelAnimationFrame(state.current.raf), []);

  return (
    <div className="container mx-auto px-4 py-12">
      <Link to="/games" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Back to games
      </Link>

      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Road Run</h1>
            <p className="text-ink/60">Dodge traffic, grab coins. Arrow keys or the buttons.</p>
          </div>
          <div className="rounded-xl bg-brand px-4 py-2 text-center text-white">
            <div className="text-xs opacity-70">Score</div>
            <div className="text-xl font-bold">{score}</div>
          </div>
        </div>

        <div className="relative mx-auto overflow-hidden rounded-3xl border-4 border-ink shadow-xl" style={{ width: W, maxWidth: '100%' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerDown={tapSteer}
            className="block w-full"
            style={{ touchAction: 'none' }}
          />
          {!running && !over && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 text-white">
              <p className="px-8 text-center text-sm text-white/80">Stay in your lane, avoid cars, and collect coins for bonus points.</p>
              <button onClick={start} className="flex items-center gap-2 rounded-xl bg-go px-8 py-3.5 font-semibold text-white hover:bg-go-dark">
                <Play className="h-5 w-5" /> Start driving
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-ink/45">Tap the left or right half of the road to switch lanes — or use the buttons / arrow keys.</p>

        {showTouch && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button onClick={() => move(-1)} className="flex items-center justify-center gap-1 rounded-2xl bg-black/5 py-6 text-lg font-semibold text-ink active:bg-brand active:text-white">
              <ChevronLeft className="h-7 w-7" /> Left
            </button>
            <button onClick={() => move(1)} className="flex items-center justify-center gap-1 rounded-2xl bg-black/5 py-6 text-lg font-semibold text-ink active:bg-brand active:text-white">
              Right <ChevronRight className="h-7 w-7" />
            </button>
          </div>
        )}
      </div>

      {over && <GameOver title="Crashed!" score={score} reward={reward} onReplay={start} />}
    </div>
  );
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, player = false) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  // windshield
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  roundRect(ctx, x + w * 0.16, y + (player ? h * 0.12 : h * 0.6), w * 0.68, h * 0.2, 4);
  ctx.fill();
  roundRect(ctx, x + w * 0.16, y + (player ? h * 0.62 : h * 0.16), w * 0.68, h * 0.18, 4);
  ctx.fill();
  // wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(x - 3, y + h * 0.18, 5, h * 0.22);
  ctx.fillRect(x + w - 2, y + h * 0.18, 5, h * 0.22);
  ctx.fillRect(x - 3, y + h * 0.6, 5, h * 0.22);
  ctx.fillRect(x + w - 2, y + h * 0.6, 5, h * 0.22);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
