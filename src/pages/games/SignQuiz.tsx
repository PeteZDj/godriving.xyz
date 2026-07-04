import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X, Flame, Timer } from 'lucide-react';
import { SIGNS, RoadSign } from '../../data/signs';
import { Sign } from '../../components/Sign';
import { GameOver } from '../../components/GameOver';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const TOTAL = 10;
const PER_Q = 12; // seconds

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

interface Q {
  sign: RoadSign;
  options: string[];
  answer: string;
}

function buildQuestions(): Q[] {
  const picks = shuffle(SIGNS).slice(0, TOTAL);
  return picks.map((sign) => {
    const distractors = shuffle(SIGNS.filter((s) => s.id !== sign.id)).slice(0, 3).map((s) => s.name);
    return { sign, options: shuffle([sign.name, ...distractors]), answer: sign.name };
  });
}

export default function SignQuiz() {
  const { refresh } = useAuth();
  const [questions, setQuestions] = useState<Q[]>(buildQuestions);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [time, setTime] = useState(PER_Q);
  const [over, setOver] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const lockRef = useRef(false);

  const q = questions[idx];

  useEffect(() => {
    if (over || picked) return;
    if (time <= 0) {
      handlePick('__timeout__');
      return;
    }
    const t = setTimeout(() => setTime((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [time, picked, over]);

  function handlePick(opt: string) {
    if (lockRef.current || picked) return;
    lockRef.current = true;
    setPicked(opt);
    const isRight = opt === q.answer;
    if (isRight) {
      const timeBonus = time * 3;
      const streakBonus = streak * 10;
      setScore((s) => s + 50 + timeBonus + streakBonus);
      setCorrect((c) => c + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
    setTimeout(next, 1100);
  }

  function next() {
    lockRef.current = false;
    if (idx + 1 >= TOTAL) {
      finish();
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
      setTime(PER_Q);
    }
  }

  async function finish() {
    setOver(true);
    const accuracy = Math.round((correct / TOTAL) * 100);
    try {
      const r = await api('/scores', { body: { game: 'quiz', score, accuracy } });
      setReward(r);
      refresh();
    } catch { /* ignore */ }
  }

  function reset() {
    setQuestions(buildQuestions());
    setIdx(0);
    setPicked(null);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setTime(PER_Q);
    setOver(false);
    setReward(null);
    lockRef.current = false;
  }

  const accuracy = useMemo(() => Math.round((correct / TOTAL) * 100), [correct]);

  return (
    <div className="container mx-auto px-4 py-12">
      <Link to="/games" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Back to games
      </Link>

      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-ink/60">Question {idx + 1} / {TOTAL}</span>
          <div className="flex items-center gap-3">
            {streak > 1 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-600">
                <Flame className="h-4 w-4" /> {streak}
              </span>
            )}
            <span className="font-bold text-brand">{score} pts</span>
          </div>
        </div>

        {/* timer bar */}
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${time <= 3 ? 'bg-red-500' : 'bg-go'}`}
            style={{ width: `${(time / PER_Q) * 100}%` }}
          />
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-center gap-2 text-sm text-ink/50">
            <Timer className="h-4 w-4" /> {time}s
          </div>
          <div className="mx-auto mb-6 h-40 w-40">
            <Sign sign={q.sign} className="h-full w-full" />
          </div>
          <p className="mb-4 text-center font-semibold text-ink">What does this sign mean?</p>
          <div className="grid gap-3">
            {q.options.map((opt) => {
              const isAnswer = opt === q.answer;
              const isPicked = picked === opt;
              let cls = 'border-black/10 bg-white hover:border-brand hover:bg-brand/5';
              if (picked) {
                if (isAnswer) cls = 'border-go bg-go/10 text-go-dark';
                else if (isPicked) cls = 'border-red-400 bg-red-50 text-red-600';
                else cls = 'border-black/5 bg-white opacity-60';
              }
              return (
                <button
                  key={opt}
                  disabled={!!picked}
                  onClick={() => handlePick(opt)}
                  className={`flex items-center justify-between rounded-xl border-2 px-5 py-3.5 text-left text-sm font-medium transition-all ${cls}`}
                >
                  {opt}
                  {picked && isAnswer && <Check className="h-5 w-5 text-go" />}
                  {picked && isPicked && !isAnswer && <X className="h-5 w-5 text-red-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {over && (
        <GameOver
          title={`${correct}/${TOTAL} correct`}
          score={score}
          accuracy={accuracy}
          reward={reward}
          onReplay={reset}
        />
      )}
    </div>
  );
}
