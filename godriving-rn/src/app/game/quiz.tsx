import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SIGNS, type RoadSign } from '@/data/signs';
import { DetailHeader, GameOverModal, SignSvg } from '@/components/shared';
import { useGD } from '@/store';
import { C, font, radius } from '@/theme';
import { Card, Row, Txt } from '@/ui';

const TOTAL = 10;
const PER_Q = 12;

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
    const distractors = shuffle(SIGNS.filter((s) => s.id !== sign.id))
      .slice(0, 3)
      .map((s) => s.name);
    return { sign, options: shuffle([sign.name, ...distractors]), answer: sign.name };
  });
}

export default function SignQuiz() {
  const { submitScore } = useGD();
  const [questions, setQuestions] = useState<Q[]>(() => buildQuestions());
  const [idx, setIdx] = useState(0);
  const [time, setTime] = useState(PER_Q);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [over, setOver] = useState(false);
  const [reward, setReward] = useState({ xpGain: 0, coinGain: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const q = questions[idx];

  useEffect(() => {
    if (over || picked) return;
    setTime(PER_Q);
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handlePick('__timeout__');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      timerRef.current && clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, over]);

  const handlePick = (choice: string) => {
    if (picked) return;
    timerRef.current && clearInterval(timerRef.current);
    setPicked(choice);
    const isRight = choice === q.answer;
    const delta = isRight ? 50 + time * 3 + streak * 10 : 0;
    const nextScore = score + delta;
    const nextCorrect = isRight ? correct + 1 : correct;
    if (isRight) {
      setScore(nextScore);
      setCorrect(nextCorrect);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
    setTimeout(() => {
      if (idx + 1 >= TOTAL) finish(nextScore, nextCorrect);
      else {
        setIdx((i) => i + 1);
        setPicked(null);
      }
    }, 1100);
  };

  const finish = (finalScore: number, finalCorrect: number) => {
    const accuracy = Math.round((finalCorrect / TOTAL) * 100);
    const r = submitScore('quiz', finalScore, accuracy);
    setReward(r);
    setOver(true);
  };

  const replay = () => {
    setQuestions(buildQuestions());
    setIdx(0);
    setPicked(null);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setOver(false);
    setTime(PER_Q);
  };

  const barPct = (time / PER_Q) * 100;
  const barColor = time <= 3 ? C.red : C.go;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <DetailHeader title="Highway Code Quiz" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* HUD */}
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <Row gap={8}>
            <View style={{ backgroundColor: C.brandMuted, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Txt f={font.bodyBold} size={12.5} color={C.brand}>
                {idx + 1} / {TOTAL}
              </Txt>
            </View>
            {streak > 1 && (
              <Row gap={4} style={{ backgroundColor: C.gold + '22', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Ionicons name="flame" size={13} color={C.gold} />
                <Txt f={font.bodyBold} size={12.5} color={C.gold}>
                  {streak} streak
                </Txt>
              </Row>
            )}
          </Row>
          <Txt f={font.monoBold} size={18} color={C.brand}>
            {score.toLocaleString()}
          </Txt>
        </Row>

        {/* Timer bar */}
        <View style={{ height: 8, backgroundColor: C.line, borderRadius: 8, overflow: 'hidden', marginBottom: 18 }}>
          <View style={{ width: `${barPct}%`, height: 8, backgroundColor: barColor, borderRadius: 8 }} />
        </View>

        {/* Sign */}
        <Card style={{ alignItems: 'center' }} pad={20}>
          <SignSvg svg={q.sign.svg} size={150} />
          <Txt f={font.bold} size={16} color={C.ink} align="center" style={{ marginTop: 14 }}>
            What does this sign mean?
          </Txt>
        </Card>

        {/* Options */}
        <View style={{ marginTop: 16, gap: 10 }}>
          {q.options.map((opt) => {
            let bg: string = C.card;
            let border: string = C.line;
            let textColor: string = C.ink;
            if (picked) {
              if (opt === q.answer) {
                bg = C.go + '14';
                border = C.go;
                textColor = C.goDark;
              } else if (opt === picked) {
                bg = C.red + '14';
                border = C.red;
                textColor = C.red;
              }
            }
            return (
              <Pressable
                key={opt}
                disabled={!!picked}
                onPress={() => handlePick(opt)}
                style={{ backgroundColor: bg, borderWidth: 1.5, borderColor: border, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt f={font.bodySemi} size={14.5} color={textColor} style={{ flex: 1 }}>
                  {opt}
                </Txt>
                {picked && opt === q.answer && <Ionicons name="checkmark-circle" size={20} color={C.go} />}
                {picked && opt === picked && opt !== q.answer && <Ionicons name="close-circle" size={20} color={C.red} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <GameOverModal
        open={over}
        title={`${correct} / ${TOTAL} correct`}
        score={score}
        accuracy={Math.round((correct / TOTAL) * 100)}
        xpGain={reward.xpGain}
        coinGain={reward.coinGain}
        onReplay={replay}
        onClose={() => setOver(false)}
      />
    </View>
  );
}
