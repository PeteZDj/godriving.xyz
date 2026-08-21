import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, Pressable, ScrollView, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGD } from '@/store';
import { C, font, radius } from '@/theme';
import { Row, Txt } from '@/ui';
import {
  buildCones, gearOf, INTRO, MISSIONS, newMissionState, START_POSE, STEPS, stepCar,
  TARGET_POS, taskScore, updateMission, W, type Car, type Controls, type MissionId, type MissionState,
} from '@/game/driveCore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SCALE = 8;                 // px per metre
const CX = SCREEN_W / 2;
const CY = SCREEN_H * 0.42;      // car sits a bit above centre for road-ahead view
const CAR_W = 2 * SCALE;
const CAR_H = 4.3 * SCALE;
const px = (m: number) => m * SCALE;

const CONES = buildCones();

const slugToId = (s?: string): MissionId => {
  switch (s) {
    case 'lane': case 'lane-change': return 'lane';
    case 'roundabout': return 'roundabout';
    case 'parking': return 'parking';
    case 'threepoint': case 'reverse': case '3-point': return 'threepoint';
    default: return 'free';
  }
};

export default function DriveGame() {
  const insets = useSafeAreaInsets();
  const { submitScore } = useGD();
  const params = useLocalSearchParams<{ mission?: string }>();

  const car = useRef<Car>({ ...START_POSE.free, speed: 0 });
  const controls = useRef<Controls>({ throttle: 0, brake: 0, steer: 0, handbrake: false });
  const knocked = useRef<boolean[]>(CONES.map(() => false));
  const ms = useRef<MissionState>(newMissionState(car.current));
  const idRef = useRef<MissionId>('free');
  const startTs = useRef(Date.now());
  const doneHandled = useRef(false);
  const advTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef(0);
  const alive = useRef(true);
  const last = useRef(0);
  const hudAcc = useRef(0);
  const coneVer = useRef(0);

  const [snap, setSnap] = useState({ x: car.current.x, z: car.current.z, yaw: 0, speed: 0, coneVer: 0 });
  const [missionIdx, setMissionIdx] = useState(0);
  const [hud, setHud] = useState({ id: 'free' as MissionId, title: 'Free Drive', steps: [] as string[], step: 0, status: INTRO.free, progress: 0, done: false });
  const [tasksDone, setTasksDone] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [knob, setKnob] = useState(0);

  const applyMission = (i: number) => {
    const meta = MISSIONS[i]; if (!meta) return;
    if (advTimer.current) { clearTimeout(advTimer.current); advTimer.current = null; }
    idRef.current = meta.id;
    car.current = { ...START_POSE[meta.id], speed: 0 };
    ms.current = newMissionState(car.current);
    knocked.current = CONES.map(() => false); coneVer.current++;
    startTs.current = Date.now();
    doneHandled.current = false;
    setMissionIdx(i);
    setToast(null);
    setHud({ id: meta.id, title: meta.title, steps: STEPS[meta.id], step: 0, status: INTRO[meta.id], progress: 0, done: false });
  };

  // Game loop.
  useEffect(() => {
    alive.current = true;
    applyMission(slugId(params.mission));
    const loop = (ts: number) => {
      if (!alive.current) return;
      const dt = last.current ? Math.min(0.05, (ts - last.current) / 1000) : 0.016;
      last.current = ts;

      const hit = stepCar(car.current, controls.current, dt, CONES, knocked.current);
      if (hit) { coneVer.current++; Vibration.vibrate(20); }

      const m = updateMission(idRef.current, car.current, ms.current, dt);

      if (m.done && !doneHandled.current && idRef.current !== 'free') {
        doneHandled.current = true;
        const secs = (Date.now() - startTs.current) / 1000;
        const clean = !knocked.current.some(Boolean);
        const r = submitScore('drive', taskScore(idRef.current, secs, clean));
        setTasksDone((n) => n + 1);
        setToast(`+${r.xpGain} XP · ${clean ? 'clean run!' : 'watch the cones'}`);
        Vibration.vibrate([0, 30, 40, 30]);
        const idx = MISSIONS.findIndex((x) => x.id === idRef.current);
        advTimer.current = setTimeout(() => { if (alive.current) applyMission(idx >= 4 ? 1 : idx + 1); }, 3600);
      }

      setSnap({ x: car.current.x, z: car.current.z, yaw: car.current.yaw, speed: car.current.speed, coneVer: coneVer.current });
      hudAcc.current += dt;
      if (hudAcc.current > 0.14) {
        hudAcc.current = 0;
        setHud((h) => (h.id === 'free' ? h : { ...h, step: m.step, status: m.status, progress: m.progress, done: m.done }));
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive.current = false;
      cancelAnimationFrame(rafRef.current);
      if (advTimer.current) clearTimeout(advTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Steering joystick.
  const RADIUS = 46;
  const steerPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => { const v = Math.max(-1, Math.min(1, g.dx / RADIUS)); controls.current.steer = v; setKnob(v * RADIUS); },
      onPanResponderRelease: () => { controls.current.steer = 0; setKnob(0); },
      onPanResponderTerminate: () => { controls.current.steer = 0; setKnob(0); },
    }),
  ).current;

  const camX = CX - snap.x * SCALE;
  const camY = CY - snap.z * SCALE;
  const kmh = Math.round(Math.abs(snap.speed) * 3.6);

  return (
    <View style={{ flex: 1, backgroundColor: '#4f9e4f', overflow: 'hidden' }}>
      {/* World layer (follows the car) */}
      <View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: camX }, { translateY: camY }] }}>
        <StaticWorld missionId={hud.id} />
        <Cones version={snap.coneVer} knocked={knocked.current} />
        <Waypoint id={hud.id} done={hud.done} />
      </View>

      {/* Player car (centred, rotates) */}
      <View style={{ position: 'absolute', left: CX - CAR_W / 2, top: CY - CAR_H / 2, width: CAR_W, height: CAR_H, transform: [{ rotate: `${snap.yaw}rad` }] }}>
        <CarSprite />
      </View>

      {/* ---------- overlays ---------- */}
      {/* Back + task chips */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 8, paddingHorizontal: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)/games'))} style={pill}>
            <Ionicons name="chevron-back" size={16} color={C.white} />
            <Txt f={font.bodyBold} size={13} color={C.white}>Exit</Txt>
          </Pressable>
          <View style={[pill, { gap: 6 }]}>
            <Ionicons name="checkmark-done" size={14} color={C.go} />
            <Txt f={font.bodyBold} size={12} color={C.white}>{tasksDone}/4</Txt>
          </View>
        </Row>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
          {MISSIONS.map((mi, i) => (
            <Pressable key={mi.id} onPress={() => applyMission(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: i === missionIdx ? C.go : '#0b1220cc', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Ionicons name={mi.icon as any} size={14} color={C.white} />
              <Txt f={font.bodyBold} size={12} color={C.white}>{mi.title}</Txt>
            </Pressable>
          ))}
        </ScrollView>

        {/* Objective card */}
        {hud.id !== 'free' ? (
          <View style={{ marginTop: 10, width: 250, borderRadius: 16, backgroundColor: '#0b1220d9', padding: 12 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <Txt f={font.bodyBold} size={10.5} color={C.go} style={{ letterSpacing: 1 }}>OBJECTIVE</Txt>
              {hud.done && <Row gap={4}><Ionicons name="trophy" size={12} color={C.go} /><Txt f={font.bodyBold} size={10.5} color={C.go}>Done</Txt></Row>}
            </Row>
            {hud.steps.map((s, i) => {
              const complete = i < hud.step || hud.done;
              const active = i === hud.step && !hud.done;
              return (
                <Row key={i} gap={7} style={{ marginBottom: 3, alignItems: 'flex-start' }}>
                  <View style={{ marginTop: 1, width: 15, height: 15, borderRadius: 8, backgroundColor: complete ? C.go : active ? '#ffffff33' : '#ffffff14', alignItems: 'center', justifyContent: 'center' }}>
                    <Txt f={font.bodyBold} size={9} color={C.white}>{complete ? '✓' : i + 1}</Txt>
                  </View>
                  <Txt f={font.body} size={11.5} color={complete ? '#ffffff66' : active ? C.white : '#ffffff88'} style={{ flex: 1, textDecorationLine: complete ? 'line-through' : 'none' }}>{s}</Txt>
                </Row>
              );
            })}
            <View style={{ height: 6, borderRadius: 6, backgroundColor: '#ffffff1f', overflow: 'hidden', marginTop: 6 }}>
              <View style={{ height: 6, borderRadius: 6, backgroundColor: C.go, width: `${Math.round((hud.done ? 1 : hud.progress) * 100)}%` }} />
            </View>
            <Txt f={font.body} size={10.5} color="#ffffffb3" style={{ marginTop: 5 }}>{hud.status}</Txt>
          </View>
        ) : (
          <View style={{ marginTop: 10, width: 230, borderRadius: 16, backgroundColor: '#0b1220cc', padding: 11 }}>
            <Txt f={font.body} size={11.5} color="#ffffffcc" lh={17}>{INTRO.free}</Txt>
          </View>
        )}
      </View>

      {/* Minimap */}
      <View style={{ position: 'absolute', right: 12, top: insets.top + 52 }}>
        <MiniMap carX={snap.x} carZ={snap.z} yaw={snap.yaw} missionId={hud.id} done={hud.done} />
      </View>

      {/* Speed */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 118, alignSelf: 'center', backgroundColor: '#0b1220cc', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 6, alignItems: 'center' }}>
        <Row gap={4} style={{ alignItems: 'flex-end' }}>
          <Txt f={font.black} size={26} color={C.white}>{kmh}</Txt>
          <Txt f={font.body} size={10} color="#ffffff88" style={{ marginBottom: 4 }}>km/h</Txt>
        </Row>
        <Txt f={font.body} size={10} color="#ffffff88">Gear <Txt f={font.bodyBold} size={10} color={C.white}>{gearOf(snap.speed)}</Txt></Txt>
      </View>

      {/* Toast */}
      {toast && (
        <View style={{ position: 'absolute', top: insets.top + 150, alignSelf: 'center', backgroundColor: C.go, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10 }}>
          <Txt f={font.bold} size={14} color={C.white}>{hud.title} complete!</Txt>
          <Txt f={font.body} size={11} color="#ffffffdd" align="center">{toast}</Txt>
        </View>
      )}

      {/* Steering joystick */}
      <View {...steerPan.panHandlers} style={{ position: 'absolute', left: 18, bottom: insets.bottom + 20, width: 128, height: 128, borderRadius: 64, backgroundColor: '#0b122055', borderWidth: 1, borderColor: '#ffffff33', alignItems: 'center', justifyContent: 'center' }}>
        <Txt f={font.bodyBold} size={10} color="#ffffff66" style={{ position: 'absolute', top: 10, letterSpacing: 2 }}>STEER</Txt>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ffffffd9', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: knob }] }}>
          <Ionicons name="swap-horizontal" size={22} color="#0b1220" />
        </View>
      </View>

      {/* Pedals */}
      <View style={{ position: 'absolute', right: 18, bottom: insets.bottom + 20, flexDirection: 'row', gap: 12 }}>
        <Pedal label="BRAKE" tone="brake" onDown={() => (controls.current.brake = 1)} onUp={() => (controls.current.brake = 0)} />
        <Pedal label="GAS" tone="gas" onDown={() => (controls.current.throttle = 1)} onUp={() => (controls.current.throttle = 0)} />
      </View>
    </View>
  );
}

// Helper wrapper (keeps hook order clean when reading a route param default).
function slugId(s?: string): number {
  const id = slugToId(s);
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i < 0 ? 0 : i;
}

const pill = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, backgroundColor: '#0b1220cc', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 };

/* ---------------- static world ---------------- */
const StaticWorld = React.memo(function StaticWorld({ missionId }: { missionId: MissionId }) {
  const rectC = (cx: number, cz: number, w: number, h: number, style: any) => (
    <View style={[{ position: 'absolute', left: px(cx) - (w * SCALE) / 2, top: px(cz) - (h * SCALE) / 2, width: w * SCALE, height: h * SCALE }, style]} />
  );
  const circle = (cx: number, cz: number, r: number, style: any) => (
    <View style={[{ position: 'absolute', left: px(cx) - r * SCALE, top: px(cz) - r * SCALE, width: r * 2 * SCALE, height: r * 2 * SCALE, borderRadius: r * SCALE }, style]} />
  );
  const vLine = (x: number, za: number, zb: number, color = '#e5e7eb', wpx = 2, opacity = 0.7) => {
    const zTop = Math.min(za, zb), zBot = Math.max(za, zb);
    return <View style={{ position: 'absolute', left: px(x) - wpx / 2, top: px(zTop), width: wpx, height: px(zBot - zTop), backgroundColor: color, opacity }} />;
  };

  const dashes: React.ReactNode[] = [];
  for (const dx of [-3, 3]) for (let z = W.laneZ.top; z > W.laneZ.bottom; z -= 4) dashes.push(<View key={`${dx}_${z}`} style={{ position: 'absolute', left: px(dx) - 1, top: px(z), width: 2, height: px(2.2), backgroundColor: '#e5e7eb', opacity: 0.6 }} />);

  return (
    <>
      {/* tarmac */}
      <View style={{ position: 'absolute', left: px(W.xMin), top: px(W.zMin), width: px(W.xMax - W.xMin), height: px(W.zMax - W.zMin), backgroundColor: '#33383f' }} />
      {/* lane edges + dashes */}
      {vLine(-8, W.laneZ.top, W.laneZ.bottom)}
      {vLine(8, W.laneZ.top, W.laneZ.bottom)}
      {dashes}
      {/* start crosswalk */}
      {[-3, -1.5, 0, 1.5, 3].map((x) => <View key={x} style={{ position: 'absolute', left: px(x) - 5, top: px(18) - 12, width: 10, height: 24, backgroundColor: '#e5e7eb', opacity: 0.7, borderRadius: 2 }} />)}

      {/* roundabout */}
      {circle(W.rb.x, W.rb.z, W.rb.out, { borderWidth: 2, borderColor: '#ffffff55' })}
      {circle(W.rb.x, W.rb.z, W.rb.island, { backgroundColor: '#3f8f43', borderWidth: 3, borderColor: '#cfd4da' })}

      {/* parking lane + bays */}
      {vLine(W.laneParkX, -44, -72, '#e5e7eb', 2, 0.5)}
      {W.baysZ.map((z) => {
        const target = z === W.bayTargetZ && missionId === 'parking';
        return rectC(W.bayX, z, 5.6, 2.8, { borderWidth: 2, borderColor: target ? C.go : '#ffffff88', backgroundColor: target ? C.go + '33' : 'transparent', borderRadius: 2 });
      })}

      {/* 3-point channel dead-end wall */}
      {rectC(W.ch.xMin - 0.6, (W.ch.zMin + W.ch.zMax) / 2, 0.8, W.ch.zMax - W.ch.zMin + 1, { backgroundColor: '#b45309', borderRadius: 2 })}

      {/* task highlights */}
      {missionId === 'lane' && rectC(W.laneTargetX, -8, 3.6, 30, { backgroundColor: C.go + '2e', borderRadius: 4 })}
      {missionId === 'roundabout' && rectC(W.rb.x + W.rb.out + 4, W.rb.z, 8, 8, { backgroundColor: C.go + '38', borderRadius: 6 })}
      {missionId === 'threepoint' && rectC((W.ch.xMin + W.ch.xMax) / 2, (W.ch.zMin + W.ch.zMax) / 2, W.ch.xMax - W.ch.xMin, W.ch.zMax - W.ch.zMin, { backgroundColor: C.go + '24', borderRadius: 4 })}
    </>
  );
});

/* ---------------- cones ---------------- */
const Cones = React.memo(
  function Cones({ knocked }: { version: number; knocked: boolean[] }) {
    return (
      <>
        {CONES.map((c, i) => (
          <View key={i} style={{ position: 'absolute', left: px(c.x) - 5, top: px(c.z) - 5, width: 10, height: 10, borderRadius: 3, backgroundColor: '#f97316', opacity: knocked[i] ? 0.35 : 1, borderWidth: 1.5, borderColor: '#c2410c', transform: knocked[i] ? [{ rotate: '55deg' }] : [] }} />
        ))}
      </>
    );
  },
  (a, b) => a.version === b.version,
);

/* ---------------- waypoint ---------------- */
function Waypoint({ id, done }: { id: MissionId; done: boolean }) {
  const t = TARGET_POS[id];
  if (!t || done) return null;
  return (
    <View style={{ position: 'absolute', left: px(t.x) - 18, top: px(t.z) - 18, width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: C.go, backgroundColor: C.go + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="flag" size={14} color={C.go} />
    </View>
  );
}

/* ---------------- car sprite ---------------- */
function CarSprite() {
  return (
    <View style={{ flex: 1, backgroundColor: C.brand, borderRadius: 6, borderWidth: 1.5, borderColor: '#00000033' }}>
      <View style={{ position: 'absolute', left: 3, right: 3, top: 6, height: 9, backgroundColor: '#dbeafe', borderRadius: 3 }} />
      <View style={{ position: 'absolute', left: 3, right: 3, bottom: 8, height: 8, backgroundColor: '#93c5fd', borderRadius: 3 }} />
      <View style={{ position: 'absolute', left: 2, top: 1, width: 4, height: 3, backgroundColor: '#fff7cc', borderRadius: 1 }} />
      <View style={{ position: 'absolute', right: 2, top: 1, width: 4, height: 3, backgroundColor: '#fff7cc', borderRadius: 1 }} />
    </View>
  );
}

/* ---------------- minimap ---------------- */
const MINI_W = 108, MINI_H = 96, MINI_PAD = 6;
function MiniMap({ carX, carZ, yaw, missionId, done }: { carX: number; carZ: number; yaw: number; missionId: MissionId; done: boolean }) {
  const sx = (x: number) => MINI_PAD + ((x - W.xMin) / (W.xMax - W.xMin)) * (MINI_W - 2 * MINI_PAD);
  const sz = (z: number) => MINI_PAD + ((z - W.zMin) / (W.zMax - W.zMin)) * (MINI_H - 2 * MINI_PAD);
  const t = TARGET_POS[missionId];
  const rbR = (sx(W.rb.out) - sx(-W.rb.out + W.rb.x)) / 2;
  return (
    <View style={{ width: MINI_W, height: MINI_H, borderRadius: 10, backgroundColor: '#39603a', borderWidth: 1, borderColor: '#ffffff33', overflow: 'hidden' }}>
      {/* tarmac */}
      <View style={{ position: 'absolute', left: sx(W.xMin), top: sz(W.zMin), width: sx(W.xMax) - sx(W.xMin), height: sz(W.zMax) - sz(W.zMin), backgroundColor: '#2c3138' }} />
      {/* roundabout */}
      <View style={{ position: 'absolute', left: sx(W.rb.x) - rbR, top: sz(W.rb.z) - rbR, width: rbR * 2, height: rbR * 2, borderRadius: rbR, borderWidth: 1, borderColor: '#7c8797' }} />
      {/* bays */}
      {W.baysZ.map((z) => (
        <View key={z} style={{ position: 'absolute', left: sx(W.bayX) - 4, top: sz(z) - 2, width: 8, height: 4, borderWidth: 0.6, borderColor: z === W.bayTargetZ && missionId === 'parking' ? C.go : '#7c8797' }} />
      ))}
      {/* channel */}
      <View style={{ position: 'absolute', left: sx(W.ch.xMin), top: sz(W.ch.zMax), width: sx(W.ch.xMax) - sx(W.ch.xMin), height: sz(W.ch.zMin) - sz(W.ch.zMax), borderWidth: 0.6, borderColor: missionId === 'threepoint' ? C.go : '#a86a2a' }} />
      {/* objective */}
      {t && !done && <View style={{ position: 'absolute', left: sx(t.x) - 3, top: sz(t.z) - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: C.go }} />}
      {/* car */}
      <View style={{ position: 'absolute', left: sx(carX) - 4, top: sz(carZ) - 4, width: 8, height: 8, transform: [{ rotate: `${yaw}rad` }] }}>
        <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#f8fafc' }} />
      </View>
      <Txt f={font.bodyBold} size={8} color="#e5e7eb" style={{ position: 'absolute', right: 4, top: 2 }}>N</Txt>
    </View>
  );
}

/* ---------------- pedal ---------------- */
function Pedal({ label, tone, onDown, onUp }: { label: string; tone: 'gas' | 'brake'; onDown: () => void; onUp: () => void }) {
  const [down, setDown] = useState(false);
  const bg = tone === 'gas' ? (down ? '#3D9140' : '#4CAF50') : down ? '#B91C1C' : '#D21E2B';
  return (
    <Pressable
      onPressIn={() => { setDown(true); onDown(); Vibration.vibrate(10); }}
      onPressOut={() => { setDown(false); onUp(); }}
      style={{ width: 74, height: 92, borderRadius: 18, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={tone === 'gas' ? 'chevron-up' : 'stop'} size={22} color={C.white} />
      <Txt f={font.bodyBold} size={12} color={C.white} style={{ marginTop: 4 }}>{label}</Txt>
    </Pressable>
  );
}
