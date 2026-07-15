import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import { DetailHeader, GameOverModal } from '@/components/shared';
import { useGD } from '@/store';
import { C, font, radius } from '@/theme';
import { Row, Txt } from '@/ui';

const { width } = Dimensions.get('window');
const W = Math.min(width - 24, 380);
const H = 540;
const LANES = 3;
const LANE_W = W / LANES;
const CAR_W = LANE_W * 0.56;
const CAR_H = 92;
const CAR_Y = H - CAR_H - 20;
const CAR_COLORS = ['#d21e2b', '#e6a700', '#4caf50', '#0071bc'];

interface Obstacle {
  id: number;
  lane: number;
  y: number;
  type: 'car' | 'coin';
  color: string;
}

const laneX = (lane: number) => lane * LANE_W + (LANE_W - CAR_W) / 2;

export default function RoadRun() {
  const { submitScore } = useGD();
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [snap, setSnap] = useState<{ obstacles: Obstacle[]; lane: number; score: number; coins: number; dist: number }>({
    obstacles: [],
    lane: 1,
    score: 0,
    coins: 0,
    dist: 0,
  });
  const [result, setResult] = useState({ score: 0, coins: 0, xpGain: 0, coinGain: 0 });

  const g = useRef({
    dist: 0,
    speed: 3,
    spawnT: 40,
    obstacles: [] as Obstacle[],
    lane: 1,
    coins: 0,
    nextId: 1,
    raf: 0 as any,
    alive: false,
  });

  const stop = () => {
    g.current.alive = false;
    if (g.current.raf) cancelAnimationFrame(g.current.raf);
  };

  useEffect(() => () => stop(), []);

  const gameOver = () => {
    stop();
    const dist = g.current.dist;
    const coins = g.current.coins;
    const score = Math.floor(dist / 10) + coins * 25;
    const r = submitScore('roadrun', score);
    setResult({ score, coins, xpGain: r.xpGain, coinGain: r.coinGain });
    setRunning(false);
    setOver(true);
  };

  const loop = () => {
    if (!g.current.alive) return;
    const s = g.current;
    s.speed = 3 + s.dist / 2200;
    s.dist += s.speed;

    // move obstacles
    for (const o of s.obstacles) o.y += s.speed;

    // spawn
    s.spawnT -= 1;
    if (s.spawnT <= 0) {
      s.spawnT = Math.max(28, 70 - s.dist / 400);
      const lane = Math.floor(Math.random() * LANES);
      const isCoin = Math.random() < 0.35;
      s.obstacles.push({
        id: s.nextId++,
        lane,
        y: -CAR_H,
        type: isCoin ? 'coin' : 'car',
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      });
    }

    // collisions
    const remaining: Obstacle[] = [];
    for (const o of s.obstacles) {
      const overlap = o.lane === s.lane && o.y + 40 > CAR_Y && o.y < CAR_Y + CAR_H;
      if (overlap) {
        if (o.type === 'coin') {
          s.coins += 1;
          continue; // consume
        } else {
          gameOver();
          return;
        }
      }
      if (o.y < H + CAR_H) remaining.push(o);
    }
    s.obstacles = remaining;

    setSnap({
      obstacles: [...s.obstacles],
      lane: s.lane,
      score: Math.floor(s.dist / 10) + s.coins * 25,
      coins: s.coins,
      dist: s.dist,
    });

    g.current.raf = requestAnimationFrame(loop);
  };

  const start = () => {
    g.current = { dist: 0, speed: 3, spawnT: 40, obstacles: [], lane: 1, coins: 0, nextId: 1, raf: 0, alive: true };
    setSnap({ obstacles: [], lane: 1, score: 0, coins: 0, dist: 0 });
    setOver(false);
    setRunning(true);
    g.current.raf = requestAnimationFrame(loop);
  };

  const move = (dir: -1 | 1) => {
    if (!g.current.alive) return;
    g.current.lane = Math.max(0, Math.min(LANES - 1, g.current.lane + dir));
    setSnap((p) => ({ ...p, lane: g.current.lane }));
  };

  const dashOffset = snap.dist % 64;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <DetailHeader title="Road Run" />
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 12 }}>
        {/* HUD */}
        <Row style={{ width: W, justifyContent: 'space-between', marginBottom: 10 }}>
          <Row gap={5}>
            <Ionicons name="speedometer" size={16} color={C.brand} />
            <Txt f={font.monoBold} size={18} color={C.brand}>
              {snap.score.toLocaleString()}
            </Txt>
          </Row>
          <Row gap={5}>
            <Ionicons name="cash" size={16} color={C.gold} />
            <Txt f={font.monoBold} size={18} color={C.gold}>
              {snap.coins}
            </Txt>
          </Row>
        </Row>

        {/* Play area */}
        <View style={{ width: W, height: H, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#39424e', borderWidth: 3, borderColor: '#2f7d32' }}>
          {/* lane dividers */}
          {[1, 2].map((i) => (
            <View key={i} style={{ position: 'absolute', left: i * LANE_W - 2, top: 0, bottom: 0, width: 4 }}>
              {Array.from({ length: Math.ceil(H / 64) + 1 }).map((_, k) => (
                <View
                  key={k}
                  style={{ position: 'absolute', top: k * 64 - 64 + dashOffset, left: 0, width: 4, height: 32, backgroundColor: '#ffffff', opacity: 0.6, borderRadius: 2 }}
                />
              ))}
            </View>
          ))}

          {/* obstacles */}
          {snap.obstacles.map((o) =>
            o.type === 'coin' ? (
              <View
                key={o.id}
                style={{ position: 'absolute', top: o.y, left: o.lane * LANE_W + (LANE_W - 34) / 2, width: 34, height: 34, borderRadius: 17, backgroundColor: '#ffcf33', borderWidth: 3, borderColor: '#c99700', alignItems: 'center', justifyContent: 'center' }}>
                <Txt f={font.black} size={16} color="#8a6d00">
                  $
                </Txt>
              </View>
            ) : (
              <CarSprite key={o.id} x={o.lane * LANE_W + (LANE_W - CAR_W) / 2} y={o.y} color={o.color} enemy />
            ),
          )}

          {/* player */}
          <CarSprite x={laneX(snap.lane)} y={CAR_Y} color={C.brand} />

          {/* overlays */}
          {!running && !over && (
            <View style={{ ...StyleAbsFill, backgroundColor: '#0b1b2bCC', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <Ionicons name="car-sport" size={48} color={C.go} />
              <Txt f={font.black} size={22} color={C.white} align="center" style={{ marginTop: 12 }}>
                Road Run
              </Txt>
              <Txt f={font.body} size={13} color="#9FC7E4" align="center" style={{ marginTop: 8, lineHeight: 19 }}>
                Switch lanes to dodge traffic and grab coins. Each coin is worth 25 points.
              </Txt>
              <Pressable onPress={start} style={{ marginTop: 20, backgroundColor: C.go, borderRadius: radius.pill, paddingHorizontal: 28, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="play" size={18} color={C.white} />
                <Txt f={font.bodyBold} size={15} color={C.white}>
                  Start driving
                </Txt>
              </Pressable>
            </View>
          )}
        </View>

        {/* Controls */}
        {running && (
          <Row style={{ width: W, marginTop: 16, gap: 12 }}>
            <ControlBtn icon="chevron-back" onPress={() => move(-1)} />
            <ControlBtn icon="chevron-forward" onPress={() => move(1)} />
          </Row>
        )}
      </View>

      <GameOverModal
        open={over}
        title="Crash!"
        score={result.score}
        xpGain={result.xpGain}
        coinGain={result.coinGain}
        onReplay={start}
        onClose={() => setOver(false)}
      />
    </View>
  );
}

const StyleAbsFill = { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };

function CarSprite({ x, y, color, enemy }: { x: number; y: number; color: string; enemy?: boolean }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, width: CAR_W, height: CAR_H }}>
      <View style={{ flex: 1, backgroundColor: color, borderRadius: 14, borderWidth: 2, borderColor: '#00000022' }}>
        {/* windshield */}
        <View style={{ position: 'absolute', left: 6, right: 6, top: enemy ? undefined : 12, bottom: enemy ? 12 : undefined, height: 22, backgroundColor: '#ffffffAA', borderRadius: 6 }} />
        <View style={{ position: 'absolute', left: 6, right: 6, top: enemy ? 14 : undefined, bottom: enemy ? undefined : 14, height: 16, backgroundColor: '#ffffff55', borderRadius: 5 }} />
      </View>
    </View>
  );
}

function ControlBtn({ icon, onPress }: { icon: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 62,
        borderRadius: radius.lg,
        backgroundColor: pressed ? C.brandDark : C.brand,
        alignItems: 'center',
        justifyContent: 'center',
      })}>
      <Ionicons name={icon} size={30} color={C.white} />
    </Pressable>
  );
}
