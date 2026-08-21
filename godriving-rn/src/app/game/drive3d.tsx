import { Ionicons } from '@expo/vector-icons';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, Vibration, View } from 'react-native';
import * as THREE from 'three';
import { useGD } from '@/store';
import { C, font, radius } from '@/theme';
import { Row, Txt } from '@/ui';
import {
  buildCones, gearOf, INTRO, MISSIONS, newMissionState, START_POSE, STEPS, stepCar,
  TARGET_POS, taskScore, updateMission, W, type Car, type Controls, type MissionId, type MissionState,
} from '@/game/driveCore';

type ViewMode = 'first' | 'third' | 'top';
const EYE_H = 1.15;
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

export default function Drive3D() {
  const { submitScore } = useGD();
  const params = useLocalSearchParams<{ mission?: string }>();
  const [ready, setReady] = useState(false);

  const car = useRef<Car>({ ...START_POSE.free, speed: 0 });
  const controls = useRef<Controls>({ throttle: 0, brake: 0, steer: 0, handbrake: false });
  const knocked = useRef<boolean[]>(CONES.map(() => false));
  const ms = useRef<MissionState>(newMissionState(car.current));
  const idRef = useRef<MissionId>('free');
  const viewRef = useRef<ViewMode>('third');
  const startTs = useRef(Date.now());
  const doneHandled = useRef(false);
  const advTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const applyRef = useRef<(i: number) => void>(() => {});

  const [missionIdx, setMissionIdx] = useState(0);
  const [view, setView] = useState<ViewMode>('third');
  const [hud, setHud] = useState({ id: 'free' as MissionId, title: 'Free Drive', steps: [] as string[], step: 0, status: INTRO.free, progress: 0, done: false });
  const [tasksDone, setTasksDone] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [knob, setKnob] = useState(0);

  // Lock to landscape while this screen is mounted.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE); } catch {}
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const setViewMode = (v: ViewMode) => { viewRef.current = v; setView(v); };

  /* ---------------- GL scene ---------------- */
  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    const canvasShim = { width, height, style: {}, clientWidth: width, clientHeight: height, addEventListener() {}, removeEventListener() {}, getContext: () => gl } as any;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasShim, context: gl as any, antialias: true });
    renderer.setSize(width, height, false);
    (renderer as any).outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fc6f2);
    scene.fog = new THREE.Fog(0x8fc6f2, 90, 360);
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 800);
    scene.add(camera);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f5a, 1.05));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.05); sun.position.set(50, 80, 25); scene.add(sun);

    // ground + tarmac
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshLambertMaterial({ color: 0x4f9e4f }));
    grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; scene.add(grass);
    const tarmac = new THREE.Mesh(new THREE.PlaneGeometry(W.xMax - W.xMin + 10, W.zMax - W.zMin + 10), new THREE.MeshLambertMaterial({ color: 0x33383f }));
    tarmac.rotation.x = -Math.PI / 2; tarmac.position.set((W.xMin + W.xMax) / 2, 0, (W.zMin + W.zMax) / 2); scene.add(tarmac);

    const white = new THREE.MeshBasicMaterial({ color: 0xeef2f6 });
    const paint = (w: number, d: number, x: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), white); m.position.set(x, 0.03, z); scene.add(m); };
    paint(0.18, 48, -8, -8); paint(0.18, 48, 8, -8);
    for (const dx of [-3, 3]) for (let z = W.laneZ.top; z > W.laneZ.bottom; z -= 4) paint(0.16, 2.2, dx, z);

    // roundabout
    const island = new THREE.Mesh(new THREE.CylinderGeometry(W.rb.island, W.rb.island, 0.7, 40), new THREE.MeshLambertMaterial({ color: 0x3f8f43 }));
    island.position.set(W.rb.x, 0.35, W.rb.z); scene.add(island);
    const kerb = new THREE.Mesh(new THREE.TorusGeometry(W.rb.kerb, 0.25, 8, 48), new THREE.MeshLambertMaterial({ color: 0xcfd4da }));
    kerb.rotation.x = Math.PI / 2; kerb.position.set(W.rb.x, 0.15, W.rb.z); scene.add(kerb);

    // parking bays
    for (const z of W.baysZ) {
      const target = z === W.bayTargetZ;
      paint(0.16, 5.6, W.bayX - 2.8, z); paint(0.16, 5.6, W.bayX + 2.8, z); paint(5.6, 0.16, W.bayX, z - 1.4);
      if (target) { const hi = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.6), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.25 })); hi.rotation.x = -Math.PI / 2; hi.position.set(W.bayX, 0.05, z); scene.add(hi); }
    }

    // 3-point wall
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, W.ch.zMax - W.ch.zMin + 1), new THREE.MeshLambertMaterial({ color: 0xb45309 }));
    wall.position.set(W.ch.xMin - 0.6, 0.65, (W.ch.zMin + W.ch.zMax) / 2); scene.add(wall);

    // cones
    const coneGeo = new THREE.ConeGeometry(0.45, 1.1, 10);
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
    const coneMeshes = CONES.map((c) => { const m = new THREE.Mesh(coneGeo, coneMat); m.position.set(c.x, 0.55, c.z); scene.add(m); return m; });

    // waypoint
    const waypoint = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.16, 8, 28), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    waypoint.rotation.x = Math.PI / 2; waypoint.position.y = 0.15; waypoint.visible = false; scene.add(waypoint);

    // buildings
    const bColors = [0x8fa3b8, 0xa9b6c4, 0x7d94ad, 0xc0a98f];
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2, r = 120 + Math.random() * 80;
      const h = 20 + Math.random() * 50;
      const b = new THREE.Mesh(new THREE.BoxGeometry(14, h, 14), new THREE.MeshLambertMaterial({ color: bColors[i % bColors.length] }));
      b.position.set(Math.cos(ang) * r, h / 2, -40 + Math.sin(ang) * r); scene.add(b);
    }

    // player car + interior
    const makeCar = () => {
      const g = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ color: 0x2563eb });
      const lower = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.55, 4.3), mat); lower.position.y = 0.5;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 2.4), mat); upper.position.set(0, 1.02, -0.1);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.5, 2.2), new THREE.MeshLambertMaterial({ color: 0x0b1a2b })); glass.position.set(0, 1.06, -0.1);
      g.add(lower, upper, glass);
      const wg = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12); const wm = new THREE.MeshLambertMaterial({ color: 0x0b0f14 });
      for (const [wx, wz] of [[-0.98, 1.4], [0.98, 1.4], [-0.98, -1.4], [0.98, -1.4]]) { const w = new THREE.Mesh(wg, wm); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.38, wz); g.add(w); }
      return g;
    };
    const carGroup = makeCar(); scene.add(carGroup);
    const interior = new THREE.Group(); camera.add(interior);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x11151b })); dash.position.set(0, -0.62, -0.9); interior.add(dash);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 2.4), new THREE.MeshLambertMaterial({ color: 0x2563eb })); hood.position.set(0, -0.85, -2.4); interior.add(hood);

    // apply-mission wired to GL objects
    applyRef.current = (i: number) => {
      const meta = MISSIONS[i]; if (!meta) return;
      if (advTimer.current) { clearTimeout(advTimer.current); advTimer.current = null; }
      idRef.current = meta.id;
      car.current = { ...START_POSE[meta.id], speed: 0 };
      ms.current = newMissionState(car.current);
      knocked.current = CONES.map(() => false);
      coneMeshes.forEach((m, k) => { m.rotation.set(0, 0, 0); m.position.set(CONES[k].x, 0.55, CONES[k].z); });
      startTs.current = Date.now(); doneHandled.current = false;
      const t = TARGET_POS[meta.id];
      if (t) { waypoint.visible = true; waypoint.position.set(t.x, 0.15, t.z); } else waypoint.visible = false;
      setMissionIdx(i); setToast(null);
      setHud({ id: meta.id, title: meta.title, steps: STEPS[meta.id], step: 0, status: INTRO[meta.id], progress: 0, done: false });
    };
    applyRef.current(slugId(params.mission));

    const camPos = new THREE.Vector3(), tmp = new THREE.Vector3();
    let last = 0, hudAcc = 0, lastView: ViewMode | '' = '';
    const render = (ts: number) => {
      if (!alive.current) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;

      const hit = stepCar(car.current, controls.current, dt, CONES, knocked.current);
      if (hit) { Vibration.vibrate(20); knocked.current.forEach((k, idx) => { if (k) { coneMeshes[idx].rotation.z = 1.3; coneMeshes[idx].position.y = 0.25; } }); }

      const cx = car.current.x, cz = car.current.z, yaw = car.current.yaw;
      const fx = Math.sin(yaw), fz = -Math.cos(yaw);
      carGroup.position.set(cx, 0, cz); carGroup.rotation.y = yaw;
      waypoint.rotation.z += dt;

      const vm = viewRef.current;
      if (vm !== lastView) { lastView = vm; interior.visible = vm === 'first'; carGroup.visible = vm !== 'first'; camera.fov = vm === 'top' ? 55 : vm === 'third' ? 62 : 70; camera.updateProjectionMatrix(); }
      if (vm === 'first') { camera.up.set(0, 1, 0); camera.position.set(cx, EYE_H, cz); tmp.set(cx + fx * 12, EYE_H - 0.9, cz + fz * 12); camera.lookAt(tmp); }
      else if (vm === 'third') { camera.up.set(0, 1, 0); camPos.set(cx - fx * 9, 5.4, cz - fz * 9); camera.position.lerp(camPos, 0.18); tmp.set(cx + fx * 6, 1.2, cz + fz * 6); camera.lookAt(tmp); }
      else { camera.up.set(0, 0, -1); camPos.set(cx, 55, cz + 0.01); camera.position.lerp(camPos, 0.25); camera.lookAt(cx, 0, cz); }

      const m = updateMission(idRef.current, car.current, ms.current, dt);
      if (m.done && !doneHandled.current && idRef.current !== 'free') {
        doneHandled.current = true;
        const secs = (Date.now() - startTs.current) / 1000;
        const clean = !knocked.current.some(Boolean);
        const r = submitScore('drive', taskScore(idRef.current, secs, clean));
        setTasksDone((n) => n + 1);
        setToast(`+${r.xpGain} XP · ${clean ? 'clean run!' : 'watch the cones'}`);
        Vibration.vibrate([0, 30, 40, 30]);
        waypoint.visible = false;
        const idx = MISSIONS.findIndex((x) => x.id === idRef.current);
        advTimer.current = setTimeout(() => { if (alive.current) applyRef.current(idx >= 4 ? 1 : idx + 1); }, 3600);
      }
      hudAcc += dt;
      if (hudAcc > 0.14) { hudAcc = 0; setHud((h) => (h.id === 'free' ? h : { ...h, step: m.step, status: m.status, progress: m.progress, done: m.done })); }

      renderer.render(scene, camera);
      gl.endFrameEXP();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  };

  useEffect(() => () => { alive.current = false; if (advTimer.current) clearTimeout(advTimer.current); }, []);

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

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.go} size="large" /><Txt f={font.body} size={13} color="#ffffffaa" style={{ marginTop: 12 }}>Rotating to landscape…</Txt></View>;
  }

  const views: { id: ViewMode; icon: any; label: string }[] = [
    { id: 'first', icon: 'eye', label: 'Cockpit' }, { id: 'third', icon: 'car-sport', label: 'Chase' }, { id: 'top', icon: 'map', label: 'Top' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#8fc6f2' }}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />

      {/* Top overlays */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 10, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 8 }}>
          <Row gap={8}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)/games'))} style={pill}><Ionicons name="chevron-back" size={16} color={C.white} /><Txt f={font.bodyBold} size={13} color={C.white}>Exit</Txt></Pressable>
            <View style={[pill, { gap: 6 }]}><Ionicons name="checkmark-done" size={14} color={C.go} /><Txt f={font.bodyBold} size={12} color={C.white}>{tasksDone}/4</Txt></View>
          </Row>
          {hud.id !== 'free' && (
            <View style={{ width: 250, borderRadius: 14, backgroundColor: '#0b1220d9', padding: 11 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <Txt f={font.bodyBold} size={10} color={C.go} style={{ letterSpacing: 1 }}>OBJECTIVE · {hud.title.toUpperCase()}</Txt>
                {hud.done && <Ionicons name="trophy" size={13} color={C.go} />}
              </Row>
              <View style={{ height: 6, borderRadius: 6, backgroundColor: '#ffffff1f', overflow: 'hidden' }}>
                <View style={{ height: 6, borderRadius: 6, backgroundColor: C.go, width: `${Math.round((hud.done ? 1 : hud.progress) * 100)}%` }} />
              </View>
              <Txt f={font.body} size={11} color="#ffffffcc" style={{ marginTop: 5 }}>{hud.status}</Txt>
            </View>
          )}
        </View>

        {/* task chips + view toggle */}
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Row gap={6}>
            {MISSIONS.filter((m) => m.id !== 'free').map((mi) => {
              const i = MISSIONS.findIndex((x) => x.id === mi.id);
              return (
                <Pressable key={mi.id} onPress={() => applyRef.current(i)} style={{ backgroundColor: i === missionIdx ? C.go : '#0b1220cc', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Ionicons name={mi.icon as any} size={15} color={C.white} />
                </Pressable>
              );
            })}
          </Row>
          <Row style={{ borderRadius: radius.pill, overflow: 'hidden', backgroundColor: '#0b1220cc' }}>
            {views.map((v) => (
              <Pressable key={v.id} onPress={() => setViewMode(v.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: view === v.id ? C.go : 'transparent' }}>
                <Ionicons name={v.icon} size={13} color={C.white} /><Txt f={font.bodyBold} size={11} color={C.white}>{v.label}</Txt>
              </Pressable>
            ))}
          </Row>
        </View>
      </View>

      {toast && (
        <View style={{ position: 'absolute', top: 74, alignSelf: 'center', backgroundColor: C.go, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 9 }}>
          <Txt f={font.bold} size={14} color={C.white} align="center">{hud.title} complete!</Txt>
          <Txt f={font.body} size={11} color="#ffffffdd" align="center">{toast}</Txt>
        </View>
      )}

      {/* Steering joystick */}
      <View {...steerPan.panHandlers} style={{ position: 'absolute', left: 22, bottom: 20, width: 128, height: 128, borderRadius: 64, backgroundColor: '#0b122055', borderWidth: 1, borderColor: '#ffffff33', alignItems: 'center', justifyContent: 'center' }}>
        <Txt f={font.bodyBold} size={10} color="#ffffff66" style={{ position: 'absolute', top: 10, letterSpacing: 2 }}>STEER</Txt>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ffffffd9', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: knob }] }}>
          <Ionicons name="swap-horizontal" size={22} color="#0b1220" />
        </View>
      </View>

      {/* Pedals */}
      <View style={{ position: 'absolute', right: 22, bottom: 20, flexDirection: 'row', gap: 12 }}>
        <Pedal tone="brake" onDown={() => (controls.current.brake = 1)} onUp={() => (controls.current.brake = 0)} />
        <Pedal tone="gas" onDown={() => (controls.current.throttle = 1)} onUp={() => (controls.current.throttle = 0)} />
      </View>

      {/* Speed */}
      <View style={{ position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: '#0b1220cc', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 5, alignItems: 'center' }}>
        <Row gap={4} style={{ alignItems: 'flex-end' }}><Txt f={font.black} size={22} color={C.white}>{Math.round(Math.abs(car.current.speed) * 3.6)}</Txt><Txt f={font.body} size={9} color="#ffffff88" style={{ marginBottom: 3 }}>km/h</Txt></Row>
        <Txt f={font.body} size={9} color="#ffffff88">Gear <Txt f={font.bodyBold} size={9} color={C.white}>{gearOf(car.current.speed)}</Txt></Txt>
      </View>
    </View>
  );
}

function slugId(s?: string): number { const id = slugToId(s); const i = MISSIONS.findIndex((m) => m.id === id); return i < 0 ? 0 : i; }
const pill = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, backgroundColor: '#0b1220cc', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 };

function Pedal({ tone, onDown, onUp }: { tone: 'gas' | 'brake'; onDown: () => void; onUp: () => void }) {
  const [down, setDown] = useState(false);
  const bg = tone === 'gas' ? (down ? '#3D9140' : '#4CAF50') : down ? '#B91C1C' : '#D21E2B';
  return (
    <Pressable onPressIn={() => { setDown(true); onDown(); Vibration.vibrate(10); }} onPressOut={() => { setDown(false); onUp(); }} style={{ width: 78, height: 88, borderRadius: 18, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={tone === 'gas' ? 'chevron-up' : 'stop'} size={22} color={C.white} />
      <Txt f={font.bodyBold} size={12} color={C.white} style={{ marginTop: 4 }}>{tone === 'gas' ? 'GAS' : 'BRAKE'}</Txt>
    </Pressable>
  );
}
