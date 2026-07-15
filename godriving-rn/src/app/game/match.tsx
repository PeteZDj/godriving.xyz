import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { SIGNS } from '@/data/signs';
import { DetailHeader, GameOverModal, SignSvg } from '@/components/shared';
import { useGD } from '@/store';
import { C, font, radius } from '@/theme';
import { Card, Row, Txt } from '@/ui';

const PAIRS = 6;
const { width } = Dimensions.get('window');
const COLS = 3;
const GAP = 10;
const CARD = (width - 16 * 2 - GAP * (COLS - 1)) / COLS;

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

interface CardItem {
  key: string;
  pairId: string;
  kind: 'sign' | 'name';
  svg?: string;
  label?: string;
}

function buildDeck(): CardItem[] {
  const picks = shuffle(SIGNS).slice(0, PAIRS);
  const cards: CardItem[] = [];
  picks.forEach((s) => {
    cards.push({ key: `${s.id}-sign`, pairId: s.id, kind: 'sign', svg: s.svg });
    cards.push({ key: `${s.id}-name`, pairId: s.id, kind: 'name', label: s.name });
  });
  return shuffle(cards);
}

export default function SignMatch() {
  const { submitScore } = useGD();
  const [deck, setDeck] = useState<CardItem[]>(() => buildDeck());
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const [result, setResult] = useState({ score: 0, accuracy: 0, xpGain: 0, coinGain: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!started || over) return;
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    return () => {
      timerRef.current && clearInterval(timerRef.current);
    };
  }, [started, over]);

  const liveScore = Math.max(50, 1000 - time * 8 - Math.max(0, moves - PAIRS) * 15);

  useEffect(() => {
    if (matched.length === PAIRS * 2 && started) {
      timerRef.current && clearInterval(timerRef.current);
      const score = Math.max(50, 1000 - time * 8 - Math.max(0, moves - PAIRS) * 15);
      const accuracy = Math.round((PAIRS / Math.max(moves, PAIRS)) * 100);
      const r = submitScore('match', score, accuracy);
      setResult({ score, accuracy, xpGain: r.xpGain, coinGain: r.coinGain });
      setOver(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched]);

  const onTap = (card: CardItem) => {
    if (lockRef.current) return;
    if (!started) setStarted(true);
    if (flipped.includes(card.key) || matched.includes(card.key)) return;
    const next = [...flipped, card.key];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [aKey, bKey] = next;
      const a = deck.find((c) => c.key === aKey)!;
      const b = deck.find((c) => c.key === bKey)!;
      if (a.pairId === b.pairId) {
        setMatched((m) => [...m, aKey, bKey]);
        setFlipped([]);
      } else {
        lockRef.current = true;
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, 800);
      }
    }
  };

  const replay = () => {
    setDeck(buildDeck());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTime(0);
    setStarted(false);
    setOver(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <DetailHeader title="Sign Match" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Txt f={font.body} size={13} color={C.textSub} style={{ lineHeight: 19 }}>
          Match each sign with its name. Fewer moves and less time means a higher score.
        </Txt>

        {/* HUD */}
        <Row style={{ justifyContent: 'space-between', marginTop: 14, marginBottom: 16 }}>
          <Stat icon="time" label="Time" value={`${time}s`} />
          <Stat icon="repeat" label="Moves" value={String(moves)} />
          <Stat icon="checkmark-done" label="Pairs" value={`${matched.length / 2}/${PAIRS}`} />
          <Stat icon="star" label="Score" value={liveScore.toLocaleString()} color={C.brand} />
        </Row>

        {/* Grid */}
        <Row style={{ flexWrap: 'wrap', gap: GAP }}>
          {deck.map((card) => {
            const isUp = flipped.includes(card.key) || matched.includes(card.key);
            const isMatched = matched.includes(card.key);
            return (
              <Pressable key={card.key} onPress={() => onTap(card)} style={{ width: CARD, height: CARD }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: isMatched ? C.go : isUp ? C.brand : C.line,
                    backgroundColor: isMatched ? C.go + '12' : C.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 6,
                  }}>
                  {isUp ? (
                    card.kind === 'sign' ? (
                      <SignSvg svg={card.svg!} size={CARD - 26} />
                    ) : (
                      <Txt f={font.bodyBold} size={12.5} color={C.ink} align="center">
                        {card.label}
                      </Txt>
                    )
                  ) : (
                    <Ionicons name="help" size={30} color={C.brand + '66'} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </Row>
      </ScrollView>

      <GameOverModal
        open={over}
        title="Great memory!"
        score={result.score}
        accuracy={result.accuracy}
        xpGain={result.xpGain}
        coinGain={result.coinGain}
        onReplay={replay}
        onClose={() => setOver(false)}
      />
    </View>
  );
}

function Stat({ icon, label, value, color = C.ink }: { icon: any; label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Row gap={4}>
        <Ionicons name={icon} size={13} color={color === C.ink ? C.muted : color} />
        <Txt f={font.monoBold} size={15} color={color}>
          {value}
        </Txt>
      </Row>
      <Txt f={font.body} size={10} color={C.muted}>
        {label}
      </Txt>
    </View>
  );
}
