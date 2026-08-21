import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Volume2, VolumeX, RotateCw, Eye, Car as CarIcon, Map as MapIcon,
  ChevronDown, Check, Trophy,
} from 'lucide-react';
import * as THREE from 'three';
import { usePrefs, shouldShowControls, isTouchDevice, vibrate } from '../lib/prefs';
import { resolveDriveSide, type DriveSide } from '../lib/driveSide';

/* ==========================================================================
 * Pro 3D — a three.js driving-school training ground.
 *  • Fixed course with real task stations: lane change, roundabout, bay
 *    parking and a 3-point turn — each with live objective tracking.
 *  • Three camera views (1 first-person cockpit · 2 chase · 3 top-down),
 *    switchable with the keyboard OR on-screen buttons (for phones).
 *  • A live top-right minimap that doubles as the course map.
 *  • Desktop keyboard + mobile joystick / accelerator / brake pedals.
 * ======================================================================== */

type ViewMode = 'first' | 'third' | 'top';
interface Controls { throttle: number; brake: number; steer: number; handbrake: boolean }
interface MissionHud { id: string; title: string; steps: string[]; step: number; status: string; progress: number; done: boolean }

/* ---- world constants ---- */
const X_MIN = -78, X_MAX = 78, Z_MIN = -108, Z_MAX = 22;   // drivable clamp
const EYE_H = 1.15;
const MAX_SPEED = 18;         // m/s (~65 km/h) — a training ground
const REVERSE_SPEED = -6;

// Roundabout
const RB = { x: 0, z: -70, island: 12, kerb: 13, out: 21 };
// Lane-change lanes (centres) + zone
const LANE_X = [-6, 0, 6];
const LANE_TARGET_X = 6;
// Parking bays (row on the east side of the x=45 lane)
const BAY_X = 55, BAYS_Z = [-50, -56, -62, -68, -74], BAY_TARGET_Z = -62;
// 3-point turn channel (west)
const CH = { xMin: -73, xMax: -44, zMin: -64, zMax: -56 };

const MISSION_META = [
  { id: 'free', title: 'Free Drive', desc: 'Roam the training ground', emoji: '🗺️' },
  { id: 'lane', title: 'Lane Change', desc: 'Move across to the target lane', emoji: '↔️' },
  { id: 'roundabout', title: 'Roundabout', desc: 'Go around, take the marked exit', emoji: '🔄' },
  { id: 'parking', title: 'Bay Parking', desc: 'Park fully inside the bay', emoji: '🅿️' },
  { id: 'threepoint', title: '3-Point Turn', desc: 'Turn to face the opposite way', emoji: '↩️' },
] as const;

const START_POSE: Record<string, { x: number; z: number; yaw: number }> = {
  free: { x: 0, z: 12, yaw: 0 },
  lane: { x: 0, z: 14, yaw: 0 },
  roundabout: { x: 0, z: -44, yaw: 0 },
  parking: { x: 45, z: -44, yaw: 0 },
  threepoint: { x: -52, z: -60, yaw: -Math.PI / 2 },
};
const TARGET_POS: Record<string, { x: number; z: number } | null> = {
  free: null,
  lane: { x: LANE_TARGET_X, z: -12 },
  roundabout: { x: RB.x + RB.out + 6, z: RB.z },
  parking: { x: BAY_X, z: BAY_TARGET_Z },
  threepoint: { x: CH.xMin + 2, z: (CH.zMin + CH.zMax) / 2 },
};
const STEPS: Record<string, string[]> = {
  free: [],
  lane: ['Build up to a steady speed', 'Signal & move into the RIGHT lane', 'Straighten up and hold it'],
  roundabout: ['Approach & give way', 'Enter and follow it around', 'Leave at the marked exit'],
  parking: ['Drive up to the highlighted bay', 'Turn in and line up straight', 'Stop fully inside the bay'],
  threepoint: ['Pull forward toward the kerb', 'Reverse back, steering the other way', 'Pull forward — now facing back'],
};
const INTRO: Record<string, string> = {
  free: 'Explore the course. Open the map (top-right) and pick a task to practise.',
  lane: 'Get moving, then change one lane to your right and hold it steady.',
  roundabout: 'Head to the roundabout, follow it round and leave at the green exit.',
  parking: 'Pull into the highlighted bay and stop fully inside the lines.',
  threepoint: 'Use forward–reverse–forward to turn the car around inside the cones.',
};

function norm(a: number) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

export function Pro3DGame() {
  const { prefs } = usePrefs();
  const mountRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const controls = useRef<Controls>({ throttle: 0, brake: 0, steer: 0, handbrake: false });
  const keySteer = useRef({ left: false, right: false });
  const touchSteer = useRef(0);
  const disposeRef = useRef<() => void>(() => {});

  const side: DriveSide = resolveDriveSide(prefs.country);
  const keepSide = side;
  const showTouch = shouldShowControls(prefs.controls);

  const [hud, setHud] = useState({ speed: 0, gear: 'N' });
  const [muted, setMuted] = useState(!prefs.sound);
  const [started, setStarted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [missionIdx, setMissionIdx] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);
  const [mission, setMission] = useState<MissionHud>({ id: 'free', title: 'Free Drive', steps: [], step: 0, status: INTRO.free, progress: 0, done: false });

  const [view, setViewState] = useState<ViewMode>(isTouchDevice() ? 'third' : 'first');
  const viewRef = useRef<ViewMode>(view);
  const setView = useCallback((v: ViewMode) => { viewRef.current = v; setViewState(v); }, []);

  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const selectMissionRef = useRef<(i: number) => void>(() => {});
  const pickMission = (i: number) => { setMenuOpen(false); selectMissionRef.current(i); };

  const syncSteer = useCallback(() => {
    const k = (keySteer.current.right ? 1 : 0) - (keySteer.current.left ? 1 : 0);
    controls.current.steer = k !== 0 ? k : touchSteer.current;
  }, []);

  // Keyboard camera switching (1/2/3) — separate effect so it can call setView.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Digit1' || e.code === 'Numpad1') setView('first');
      else if (e.code === 'Digit2' || e.code === 'Numpad2') setView('third');
      else if (e.code === 'Digit3' || e.code === 'Numpad3') setView('top');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setView]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const touch = isTouchDevice();

    /* ---------- renderer / scene / camera ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    const enableShadows = !touch; // keep phones smooth
    if (enableShadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xbfe3ff, 120, 460);

    // Gradient sky backdrop.
    {
      const c = document.createElement('canvas'); c.width = 2; c.height = 256;
      const g = c.getContext('2d')!;
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, '#3b82c4'); grd.addColorStop(0.5, '#8fc6f2'); grd.addColorStop(1, '#dff1ff');
      g.fillStyle = grd; g.fillRect(0, 0, 2, 256);
      const tex = new THREE.CanvasTexture(c); (tex as any).colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
    }

    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    scene.add(camera);

    /* ---------- lights ---------- */
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f5a, 0.95));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.15);
    sun.position.set(60, 90, 30);
    if (enableShadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      const sc = sun.shadow.camera as THREE.OrthographicCamera;
      sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.near = 1; sc.far = 320;
      sun.shadow.bias = -0.0005;
    }
    scene.add(sun);

    /* ---------- grass ground ---------- */
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshLambertMaterial({ color: 0x4f9e4f }));
    grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02;
    if (enableShadows) grass.receiveShadow = true;
    scene.add(grass);

    /* ---------- tarmac training ground ---------- */
    const tarmac = new THREE.Mesh(
      new THREE.PlaneGeometry(X_MAX - X_MIN + 12, Z_MAX - Z_MIN + 12),
      new THREE.MeshLambertMaterial({ color: 0x33383f })
    );
    tarmac.rotation.x = -Math.PI / 2;
    tarmac.position.set((X_MIN + X_MAX) / 2, 0, (Z_MIN + Z_MAX) / 2);
    if (enableShadows) tarmac.receiveShadow = true;
    scene.add(tarmac);

    /* ---------- paint helper ---------- */
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xeef2f6 });
    const paint = (w: number, d: number, x: number, z: number, rotY = 0, mat: THREE.Material = whiteMat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat);
      m.position.set(x, 0.03, z); m.rotation.y = rotY; scene.add(m); return m;
    };

    // Lane-change area: solid edges + dashed dividers, z from 16 down to -34.
    paint(0.18, 52, -8, -9); paint(0.18, 52, 8, -9);
    for (const dx of [-3, 3]) for (let z = 14; z > -34; z -= 4) paint(0.16, 2.2, dx, z);
    // Start crosswalk
    for (let i = -3; i <= 3; i++) paint(0.7, 3.2, i * 1.1, 18);

    // Roundabout island + kerb + circular lane paint.
    const island = new THREE.Mesh(new THREE.CylinderGeometry(RB.island, RB.island, 0.7, 48), new THREE.MeshLambertMaterial({ color: 0x3f8f43 }));
    island.position.set(RB.x, 0.35, RB.z); if (enableShadows) island.receiveShadow = true; scene.add(island);
    const kerb = new THREE.Mesh(new THREE.TorusGeometry(RB.kerb, 0.28, 8, 64), new THREE.MeshLambertMaterial({ color: 0xcfd4da }));
    kerb.rotation.x = Math.PI / 2; kerb.position.set(RB.x, 0.18, RB.z); scene.add(kerb);
    const ringLine = new THREE.Mesh(new THREE.RingGeometry(RB.out - 0.5, RB.out - 0.3, 64), whiteMat);
    ringLine.rotation.x = -Math.PI / 2; ringLine.position.set(RB.x, 0.03, RB.z); scene.add(ringLine);
    // a small bush on the island
    const bush = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10), new THREE.MeshLambertMaterial({ color: 0x2f7d32 }));
    bush.position.set(RB.x, 1.2, RB.z); if (enableShadows) bush.castShadow = true; scene.add(bush);

    // Parking bays paint (row along east side of x=45 lane).
    paint(0.18, 34, 45, -62); // lane edge line
    for (const z of BAYS_Z) {
      paint(0.16, 5.6, 52.2, z); paint(0.16, 5.6, 57.8, z); // side lines (car parks facing east)
      paint(6, 0.16, 55, z - 2.8); // front line
    }

    /* ---------- reusable cones ---------- */
    interface Cone { m: THREE.Mesh; x: number; z: number; knocked: boolean }
    const cones: Cone[] = [];
    const coneGeo = new THREE.ConeGeometry(0.45, 1.1, 12);
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
    const addCone = (x: number, z: number) => {
      const m = new THREE.Mesh(coneGeo, coneMat);
      m.position.set(x, 0.55, z); if (enableShadows) m.castShadow = true; scene.add(m);
      cones.push({ m, x, z, knocked: false });
    };
    // Parking bay guide cones (target bay corners).
    addCone(52.2, BAY_TARGET_Z + 2.8); addCone(57.8, BAY_TARGET_Z + 2.8);
    // 3-point turn channel — two rows + dead-end.
    for (let x = CH.xMin + 1; x <= CH.xMax; x += 3.2) { addCone(x, CH.zMin + 0.4); addCone(x, CH.zMax - 0.4); }
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, CH.zMax - CH.zMin + 1), new THREE.MeshLambertMaterial({ color: 0xb45309 }));
    wall.position.set(CH.xMin - 0.6, 0.7, (CH.zMin + CH.zMax) / 2); if (enableShadows) wall.castShadow = true; scene.add(wall);

    /* ---------- task highlights (toggled per mission) ---------- */
    const hiMat = () => new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.22, depthWrite: false });
    const flat = (w: number, d: number, x: number, z: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), hiMat()); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); m.visible = false; scene.add(m); return m; };
    const laneHi = flat(3.6, 30, LANE_TARGET_X, -10);
    const bayHi = flat(5, 5.2, BAY_X, BAY_TARGET_Z);
    const channelHi = flat(CH.xMax - CH.xMin, CH.zMax - CH.zMin, (CH.xMin + CH.xMax) / 2, (CH.zMin + CH.zMax) / 2);
    const exitHi = flat(12, 8, RB.x + RB.out + 4, RB.z);

    /* ---------- objective waypoint (bobbing marker) ---------- */
    const waypoint = new THREE.Group(); waypoint.visible = false; scene.add(waypoint);
    const wpRing = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.18, 10, 32), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    wpRing.rotation.x = Math.PI / 2; wpRing.position.y = 0.1; waypoint.add(wpRing);
    const wpArrow = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    wpArrow.rotation.x = Math.PI; wpArrow.position.y = 4; waypoint.add(wpArrow);

    /* ---------- scenery: trees + buildings (metropolitan feel) ---------- */
    const treeGeo = new THREE.ConeGeometry(1.8, 5.5, 7);
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x2f7d32 });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2, r = 120 + Math.random() * 90;
      const x = Math.cos(ang) * r, z = -40 + Math.sin(ang) * r;
      const tr = new THREE.Mesh(treeGeo, treeMat); tr.position.set(x, 3, z); if (enableShadows) tr.castShadow = true; scene.add(tr);
      const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.6, 6), trunkMat); tk.position.set(x, 0.8, z); scene.add(tk);
    }
    const bColors = [0x8fa3b8, 0xa9b6c4, 0x7d94ad, 0xc0a98f, 0x9bb0a0];
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + 0.3, r = 150 + Math.random() * 120;
      const x = Math.cos(ang) * r, z = -40 + Math.sin(ang) * r;
      const w = 14 + Math.random() * 12, d = 14 + Math.random() * 12, h = 24 + Math.random() * 70;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: bColors[i % bColors.length] }));
      b.position.set(x, h / 2, z); if (enableShadows) b.castShadow = true; scene.add(b);
      const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, h * 0.82, d * 0.7), new THREE.MeshBasicMaterial({ color: 0x2b3a4a }));
      win.position.set(x, h / 2, z); scene.add(win);
    }

    /* ---------- player car ---------- */
    function makeCar(color: number) {
      const g = new THREE.Group();
      const paintMat = new THREE.MeshLambertMaterial({ color });
      const lower = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.55, 4.3), paintMat); lower.position.y = 0.5;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 2.4), paintMat); upper.position.set(0, 1.02, -0.1);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.5, 2.2), new THREE.MeshLambertMaterial({ color: 0x0b1a2b })); glass.position.set(0, 1.06, -0.1);
      g.add(lower, upper, glass);
      // lights
      const hl = new THREE.MeshBasicMaterial({ color: 0xfff6cc });
      const tl = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
      for (const x of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), hl); l.position.set(x, 0.55, -2.16); g.add(l); }
      for (const x of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tl); l.position.set(x, 0.55, 2.16); g.add(l); }
      const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16);
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0b0f14 });
      const rimMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
      for (const [wx, wz] of [[-0.98, 1.4], [0.98, 1.4], [-0.98, -1.4], [0.98, -1.4]]) {
        const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.38, wz);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 8), rimMat); rim.rotation.z = Math.PI / 2; rim.position.set(wx, 0.38, wz);
        if (enableShadows) w.castShadow = true; g.add(w, rim);
      }
      return g;
    }
    const carGroup = makeCar(0x2563eb);
    scene.add(carGroup);

    /* ---------- first-person interior (child of camera) ---------- */
    const interior = new THREE.Group(); camera.add(interior);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.5), new THREE.MeshLambertMaterial({ color: 0x11151b })); dash.position.set(0, -0.62, -0.9); interior.add(dash);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 2.4), new THREE.MeshLambertMaterial({ color: 0x2563eb })); hood.position.set(0, -0.85, -2.4); interior.add(hood);
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x0b0f14 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.6), pillarMat); roof.position.set(0, 0.78, -0.7); interior.add(roof);
    for (const px of [-1.05, 1.05]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), pillarMat); pil.position.set(px, 0.1, -1.0); pil.rotation.x = 0.25; interior.add(pil); }
    const wheelPivot = new THREE.Group(); wheelPivot.position.set(0, -0.5, -0.78); wheelPivot.rotation.x = -1.15; interior.add(wheelPivot);
    const wheelSpin = new THREE.Group(); wheelPivot.add(wheelSpin);
    wheelSpin.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 28), new THREE.MeshLambertMaterial({ color: 0x1f2937 })));
    for (const ang of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) { const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.03), new THREE.MeshLambertMaterial({ color: 0x374151 })); spoke.position.set(Math.cos(ang) * 0.13, Math.sin(ang) * 0.13, 0); spoke.rotation.z = ang; wheelSpin.add(spoke); }
    const seatOffset = keepSide === 'left' ? 0.42 : -0.42;

    /* ---------- audio ---------- */
    let actx: AudioContext | null = null, osc: OscillatorNode | null = null, gain: GainNode | null = null;
    const initAudio = () => {
      try { const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return; actx = new AC(); osc = actx.createOscillator(); gain = actx.createGain(); osc.type = 'sawtooth'; osc.frequency.value = 55; gain.gain.value = 0; osc.connect(gain).connect(actx.destination); osc.start(); } catch { /* ignore */ }
    };

    /* ---------- car state ---------- */
    const car = { x: 0, z: 12, yaw: 0, speed: 0 };

    /* ---------- mission system ---------- */
    let activeId = 'free';
    let ms: any = {};
    let doneShown = false;

    const resetCones = () => { for (const c of cones) { c.knocked = false; c.m.rotation.set(0, 0, 0); c.m.position.set(c.x, 0.55, c.z); c.m.visible = true; } };

    const applyMission = (i: number) => {
      const meta = MISSION_META[i]; if (!meta) return;
      activeId = meta.id;
      ms = { step: 0, hold: 0, acc: 0, lastAng: null, entered: false, parkT: 0, reversals: 0, lastSpeedSign: 0, startFwdX: 0, awarded: false, doneAt: 0 };
      doneShown = false;
      const s = START_POSE[meta.id]; if (s) { car.x = s.x; car.z = s.z; car.yaw = s.yaw; car.speed = 0; }
      ms.startFwdX = Math.sin(car.yaw);
      const t = TARGET_POS[meta.id];
      if (t) { waypoint.visible = true; waypoint.position.set(t.x, 0, t.z); } else waypoint.visible = false;
      laneHi.visible = activeId === 'lane';
      bayHi.visible = activeId === 'parking';
      channelHi.visible = activeId === 'threepoint';
      exitHi.visible = activeId === 'roundabout';
      resetCones();
      setMissionIdx(i);
      setMission({ id: meta.id, title: meta.title, steps: STEPS[meta.id], step: 0, status: INTRO[meta.id], progress: 0, done: false });
    };
    selectMissionRef.current = applyMission;

    const updateMission = (dt: number): MissionHud | null => {
      const fwdX = Math.sin(car.yaw);
      const kmh = Math.abs(car.speed) * 3.6;
      let step = ms.step, status = '', progress = 0, done = false;

      if (activeId === 'lane') {
        if (kmh < 8) { step = 0; status = 'Build up to a steady speed (8+ km/h)'; ms.hold = 0; }
        else {
          const inTarget = Math.abs(car.x - LANE_TARGET_X) < 1.5;
          const aligned = Math.abs(norm(car.yaw)) < 0.2;
          if (inTarget && aligned) { ms.hold += dt; step = 2; progress = Math.min(1, ms.hold / 1.8); status = `Hold it steady… ${Math.max(0, Math.ceil(1.8 - ms.hold))}s`; if (ms.hold >= 1.8) done = true; }
          else { step = 1; ms.hold = 0; status = 'Signal, check your blind spot, then move into the RIGHT lane'; }
        }
      } else if (activeId === 'roundabout') {
        const dx = car.x - RB.x, dz = car.z - RB.z, dist = Math.hypot(dx, dz);
        const ang = Math.atan2(dz, dx);
        if (!ms.entered) {
          if (dist < RB.out && dist > RB.island) { ms.entered = true; ms.lastAng = ang; step = 1; }
          else { step = 0; status = 'Approach the roundabout and slow down'; }
        }
        if (ms.entered) {
          if (ms.lastAng != null) ms.acc += norm(ang - ms.lastAng);
          ms.lastAng = ang;
          progress = Math.min(1, Math.abs(ms.acc) / (1.2 * Math.PI));
          step = progress > 0.5 ? 2 : 1;
          status = `Follow it around… ${Math.round(progress * 100)}%`;
          if (dist > RB.out + 3) {
            if (Math.abs(ms.acc) >= 1.2 * Math.PI) { done = true; status = 'Nicely done!'; }
            else { ms.entered = false; ms.acc = 0; ms.lastAng = null; status = 'You left too early — go back around'; }
          }
        }
      } else if (activeId === 'parking') {
        const inBay = Math.abs(car.x - BAY_X) < 2.7 && Math.abs(car.z - BAY_TARGET_Z) < 1.5;
        const alignedEW = Math.abs(fwdX) > 0.9;
        const stopped = Math.abs(car.speed) < 0.5;
        if (inBay && alignedEW && stopped) { ms.parkT += dt; step = 2; progress = Math.min(1, ms.parkT / 1.2); status = `Hold the brake… ${Math.max(0, Math.ceil(1.2 - ms.parkT))}s`; if (ms.parkT >= 1.2) done = true; }
        else if (inBay) { ms.parkT = 0; step = 1; status = alignedEW ? 'Come to a complete stop' : 'Straighten up inside the bay'; }
        else { ms.parkT = 0; step = 0; status = 'Drive up and turn into the highlighted bay'; }
      } else if (activeId === 'threepoint') {
        const within = car.x > CH.xMin - 1 && car.x < CH.xMax + 2 && car.z > CH.zMin - 1 && car.z < CH.zMax + 1;
        const ss = car.speed > 0.5 ? 1 : car.speed < -0.5 ? -1 : 0;
        if (ss !== 0 && ms.lastSpeedSign !== 0 && ss !== ms.lastSpeedSign) ms.reversals++;
        if (ss !== 0) ms.lastSpeedSign = ss;
        const facingBack = fwdX * ms.startFwdX < -0.85;
        step = Math.min(2, ms.reversals);
        if (!within) status = 'Stay within the cones';
        else if (facingBack && Math.abs(car.speed) < 0.8) { done = true; status = 'Turned around!'; }
        else status = `Forward → reverse → forward · point ${Math.min(3, ms.reversals + 1)}/3`;
      } else {
        return { id: 'free', title: 'Free Drive', steps: [], step: 0, status: INTRO.free, progress: 0, done: false };
      }

      ms.step = step;
      if (done && !ms.awarded) { ms.awarded = true; ms.doneAt = performance.now(); vibrate(prefs.haptics, [30, 40, 30, 40, 80]); setTasksDone((n) => n + 1); }
      return { id: activeId, title: MISSION_META[missionIdxLocal()].title, steps: STEPS[activeId], step, status, progress, done: ms.awarded };
    };
    // (missionIdx isn't readable inside the loop reliably; map id->title instead)
    const missionIdxLocal = () => MISSION_META.findIndex((m) => m.id === activeId);

    applyMission(0);

    /* ---------- minimap ---------- */
    const drawMini = () => {
      const cv = miniRef.current; if (!cv) return;
      const ctx = cv.getContext('2d'); if (!ctx) return;
      const W = cv.width, H = cv.height, pad = 8;
      const sx = (x: number) => pad + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * pad);
      const sz = (z: number) => pad + ((z - Z_MIN) / (Z_MAX - Z_MIN)) * (H - 2 * pad);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#39603a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#2c3138'; ctx.fillRect(sx(X_MIN), sz(Z_MIN), sx(X_MAX) - sx(X_MIN), sz(Z_MAX) - sz(Z_MIN));
      // lane zone
      ctx.strokeStyle = '#5b6675'; ctx.lineWidth = 1;
      ctx.strokeRect(sx(-8), sz(-34), sx(8) - sx(-8), sz(16) - sz(-34));
      // roundabout
      ctx.beginPath(); ctx.arc(sx(RB.x), sz(RB.z), (sx(RB.out) - sx(-RB.out + RB.x)) / 2 || 12, 0, Math.PI * 2); ctx.strokeStyle = '#7c8797'; ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = '#3f8f43'; ctx.arc(sx(RB.x), sz(RB.z), 7, 0, Math.PI * 2); ctx.fill();
      // bays
      for (const z of BAYS_Z) { ctx.strokeStyle = z === BAY_TARGET_Z && activeId === 'parking' ? '#22c55e' : '#7c8797'; ctx.strokeRect(sx(52.2), sz(z + 2.8), sx(57.8) - sx(52.2), sz(z - 2.8) - sz(z + 2.8)); }
      // channel
      ctx.strokeStyle = activeId === 'threepoint' ? '#22c55e' : '#a86a2a';
      ctx.strokeRect(sx(CH.xMin), sz(CH.zMax), sx(CH.xMax) - sx(CH.xMin), sz(CH.zMin) - sz(CH.zMax));
      // objective
      if (waypoint.visible) {
        const t = waypoint.position; const pulse = 3 + 2 * Math.sin(performance.now() / 220);
        ctx.beginPath(); ctx.fillStyle = '#22c55e'; ctx.arc(sx(t.x), sz(t.z), pulse, 0, Math.PI * 2); ctx.fill();
      }
      // car triangle
      const cxp = sx(car.x), czp = sz(car.z), fx = Math.sin(car.yaw), fz = -Math.cos(car.yaw);
      const ang = Math.atan2(fz, fx);
      ctx.save(); ctx.translate(cxp, czp); ctx.rotate(ang);
      ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
      // N compass
      ctx.fillStyle = '#e5e7eb'; ctx.font = 'bold 9px system-ui'; ctx.fillText('N', W - 14, 12);
    };

    /* ---------- resize ---------- */
    const onResize = () => { if (!mount) return; camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
    const ro = new ResizeObserver(onResize); ro.observe(mount);

    /* ---------- loop ---------- */
    let raf = 0, last = performance.now(), hudAcc = 0, mAcc = 0, lastView: ViewMode | '' = '';
    const camPos = new THREE.Vector3(), tmp = new THREE.Vector3();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const c = controls.current;

      // Longitudinal physics.
      if (c.throttle > 0 && c.brake === 0) car.speed += (car.speed < 0 ? 16 : 8) * c.throttle * dt;
      else if (c.brake > 0) { if (car.speed > 0) car.speed -= 16 * c.brake * dt; else car.speed -= 8 * c.brake * dt; }
      else { const drag = 3 * dt; if (car.speed > drag) car.speed -= drag; else if (car.speed < -drag) car.speed += drag; else car.speed = 0; }
      if (c.handbrake) { car.speed *= Math.pow(0.02, dt); if (Math.abs(car.speed) < 0.2) car.speed = 0; }
      car.speed = Math.max(REVERSE_SPEED, Math.min(MAX_SPEED, car.speed));

      // Steering (usable at low speed for parking, inverted in reverse).
      const turnAuth = Math.min(1, Math.abs(car.speed) / 3.5);
      car.yaw += c.steer * 2.0 * dt * turnAuth * Math.sign(car.speed || 1);

      const fx = Math.sin(car.yaw), fz = -Math.cos(car.yaw);
      car.x += fx * car.speed * dt; car.z += fz * car.speed * dt;

      // Clamp to the tarmac.
      if (car.x < X_MIN) { car.x = X_MIN; car.speed *= 0.6; }
      if (car.x > X_MAX) { car.x = X_MAX; car.speed *= 0.6; }
      if (car.z < Z_MIN) { car.z = Z_MIN; car.speed *= 0.6; }
      if (car.z > Z_MAX) { car.z = Z_MAX; car.speed *= 0.6; }

      // Roundabout island collision.
      const dO = Math.hypot(car.x - RB.x, car.z - RB.z);
      if (dO < RB.kerb + 1) { const nx = (car.x - RB.x) / (dO || 1), nz = (car.z - RB.z) / (dO || 1); car.x = RB.x + nx * (RB.kerb + 1); car.z = RB.z + nz * (RB.kerb + 1); car.speed *= 0.5; }

      // Cone knock-overs.
      for (const cn of cones) { if (cn.knocked) continue; if (Math.hypot(cn.x - car.x, cn.z - car.z) < 1.15) { cn.knocked = true; cn.m.rotation.z = 1.3; cn.m.position.y = 0.25; car.speed *= 0.8; vibrate(prefs.haptics, 25); } }

      // Update car mesh.
      carGroup.position.set(car.x, 0, car.z); carGroup.rotation.y = car.yaw;

      // Waypoint bob.
      if (waypoint.visible) { waypoint.rotation.y += dt * 1.2; wpArrow.position.y = 3.6 + Math.sin(now / 260) * 0.5; }

      // Camera per view.
      const vm = viewRef.current;
      if (vm !== lastView) {
        lastView = vm;
        interior.visible = vm === 'first';
        carGroup.visible = vm !== 'first';
        camera.fov = vm === 'top' ? 55 : vm === 'third' ? 62 : 72;
        camera.updateProjectionMatrix();
      }
      if (vm === 'first') {
        const rx = Math.cos(car.yaw), rz = Math.sin(car.yaw);
        camera.up.set(0, 1, 0);
        camera.position.set(car.x + rx * seatOffset * 0.7, EYE_H, car.z + rz * seatOffset * 0.7);
        tmp.set(car.x + fx * 12, EYE_H - 0.9, car.z + fz * 12); camera.lookAt(tmp);
        wheelSpin.rotation.z = -c.steer * 2.2;
      } else if (vm === 'third') {
        camera.up.set(0, 1, 0);
        camPos.set(car.x - fx * 9, 5.4, car.z - fz * 9);
        camera.position.lerp(camPos, 0.18);
        tmp.set(car.x + fx * 6, 1.2, car.z + fz * 6); camera.lookAt(tmp);
      } else {
        camera.up.set(0, 0, -1); // north-up map view
        camPos.set(car.x, 58, car.z + 0.01);
        camera.position.lerp(camPos, 0.25);
        camera.lookAt(car.x, 0, car.z);
      }

      // Engine audio.
      if (actx && osc && gain) { const target = mutedRef.current ? 0 : Math.min(0.05, 0.012 + Math.abs(car.speed) / 700); gain.gain.setTargetAtTime(target, actx.currentTime, 0.1); osc.frequency.setTargetAtTime(55 + Math.abs(car.speed) * 5, actx.currentTime, 0.08); }

      // Missions.
      mAcc += dt;
      const mres = updateMission(dt);
      if (mres && mres.done && !doneShown) { doneShown = true; setMission(mres); }
      if (activeId !== 'free' && ms.awarded && now - ms.doneAt > 3600) { const next = missionIdxLocal(); applyMission(next >= 4 ? 1 : next + 1); }

      // HUD (throttled).
      hudAcc += dt;
      if (hudAcc > 0.12) { hudAcc = 0; const kmh = Math.round(Math.abs(car.speed) * 3.6); const gear = car.speed > 0.5 ? 'D' : car.speed < -0.5 ? 'R' : 'N'; setHud((h) => (h.speed === kmh && h.gear === gear ? h : { speed: kmh, gear })); }
      if (mAcc > 0.15) { mAcc = 0; if (mres && !mres.done) setMission(mres); drawMini(); }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    /* ---------- keyboard driving ---------- */
    const kd = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': controls.current.throttle = 1; e.preventDefault(); break;
        case 'KeyS': case 'ArrowDown': controls.current.brake = 1; e.preventDefault(); break;
        case 'KeyA': case 'ArrowLeft': keySteer.current.left = true; e.preventDefault(); break;
        case 'KeyD': case 'ArrowRight': keySteer.current.right = true; e.preventDefault(); break;
        case 'Space': controls.current.handbrake = true; e.preventDefault(); break;
      }
      syncSteer();
    };
    const ku = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': controls.current.throttle = 0; break;
        case 'KeyS': case 'ArrowDown': controls.current.brake = 0; break;
        case 'KeyA': case 'ArrowLeft': keySteer.current.left = false; break;
        case 'KeyD': case 'ArrowRight': keySteer.current.right = false; break;
        case 'Space': controls.current.handbrake = false; break;
      }
      syncSteer();
    };
    window.addEventListener('keydown', kd, { passive: false });
    window.addEventListener('keyup', ku);

    const firstInteract = () => { if (!actx) initAudio(); window.removeEventListener('pointerdown', firstInteract); window.removeEventListener('keydown', firstInteract); };
    window.addEventListener('pointerdown', firstInteract);
    window.addEventListener('keydown', firstInteract);
    setStarted(true);

    disposeRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('pointerdown', firstInteract); window.removeEventListener('keydown', firstInteract);
      ro.disconnect();
      try { osc?.stop(); actx?.close(); } catch { /* ignore */ }
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mat = (m as any).material; if (Array.isArray(mat)) mat.forEach((x) => x?.dispose?.()); else mat?.dispose?.(); });
      renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
    return () => disposeRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keepSide]);

  /* ---------- touch handlers ---------- */
  const setSteerTouch = (v: number) => { touchSteer.current = v; syncSteer(); };
  const pedal = (which: 'throttle' | 'brake', on: boolean) => { controls.current[which] = on ? 1 : 0; if (on) vibrate(prefs.haptics); };
  const toggleMute = () => setMuted((m) => !m);

  const views: { id: ViewMode; label: string; icon: typeof Eye }[] = [
    { id: 'first', label: '1', icon: Eye }, { id: 'third', label: '2', icon: CarIcon }, { id: 'top', label: '3', icon: MapIcon },
  ];

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#8fc6f2] select-none">
      <div ref={mountRef} className="absolute inset-0" />

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-start justify-between p-3">
        <div className="flex flex-col items-start gap-2">
          <Link to="/games" className="flex items-center gap-1.5 rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-black/70">
            <ArrowLeft className="h-4 w-4" /> Exit
          </Link>

          {/* Mission menu */}
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-xl bg-black/55 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-black/70">
              <span>{MISSION_META[missionIdx].emoji}</span> {MISSION_META[missionIdx].title}
              <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div className="absolute mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]/95 shadow-2xl backdrop-blur">
                {MISSION_META.map((m, i) => (
                  <button key={m.id} onClick={() => pickMission(i)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${i === missionIdx ? 'bg-go/20' : 'hover:bg-white/5'}`}>
                    <span className="text-xl">{m.emoji}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-white">{m.title}</span>
                      <span className="block text-xs text-white/50">{m.desc}</span>
                    </span>
                    {i === missionIdx && <Check className="h-4 w-4 text-go" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Objective card */}
          {mission.id !== 'free' && (
            <div className="w-64 rounded-2xl border border-white/10 bg-black/55 p-3 text-white backdrop-blur">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-go">Objective</span>
                {mission.done && <span className="flex items-center gap-1 text-xs font-bold text-go"><Trophy className="h-3.5 w-3.5" /> Done</span>}
              </div>
              <ul className="space-y-1">
                {mission.steps.map((s, i) => (
                  <li key={i} className={`flex items-start gap-2 text-[12px] leading-snug ${i < mission.step || mission.done ? 'text-white/40 line-through' : i === mission.step ? 'text-white' : 'text-white/55'}`}>
                    <span className={`mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full text-[9px] ${i < mission.step || mission.done ? 'bg-go text-white' : i === mission.step ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'}`}>
                      {i < mission.step || mission.done ? '✓' : i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-go transition-all" style={{ width: `${Math.round((mission.done ? 1 : mission.progress) * 100)}%` }} />
              </div>
              <div className="mt-1.5 text-[11px] text-white/70">{mission.status}</div>
            </div>
          )}
          {mission.id === 'free' && (
            <div className="w-60 rounded-2xl border border-white/10 bg-black/50 p-3 text-[12px] leading-snug text-white/80 backdrop-blur">
              {INTRO.free}
            </div>
          )}
        </div>

        {/* Right: minimap + view switch */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">✓ {tasksDone}/4</div>
            <button onClick={toggleMute} className="rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70" aria-label="Mute">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/15 bg-black/40 backdrop-blur">
            <canvas ref={miniRef} width={168} height={150} className="block" />
          </div>
          {/* View switcher (keyboard 1/2/3 also work) */}
          <div className="flex overflow-hidden rounded-xl border border-white/15 bg-black/50 backdrop-blur">
            {views.map((v) => (
              <button key={v.id} onClick={() => setView(v.id)} title={`View ${v.label}`} className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold transition-colors ${view === v.id ? 'bg-go text-white' : 'text-white/70 hover:bg-white/10'}`}>
                <v.icon className="h-3.5 w-3.5" /> {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Speedometer */}
      <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-2xl bg-black/55 px-6 py-2 text-center text-white backdrop-blur">
        <div className="flex items-end gap-1">
          <span className="font-display text-3xl font-bold leading-none">{hud.speed}</span>
          <span className="mb-0.5 text-xs text-white/60">km/h</span>
        </div>
        <div className="text-xs text-white/60">Gear <span className="font-bold text-white">{hud.gear}</span></div>
      </div>

      {/* Success banner */}
      {mission.done && mission.id !== 'free' && (
        <div className="pointer-events-none absolute left-1/2 top-24 z-40 -translate-x-1/2 animate-pulse rounded-2xl bg-go/90 px-6 py-3 text-center text-white shadow-2xl backdrop-blur">
          <div className="text-lg font-bold">✓ {mission.title} complete!</div>
          <div className="text-xs text-white/80">Loading the next task…</div>
        </div>
      )}

      {/* Touch controls */}
      {showTouch && (
        <>
          <div className="absolute bottom-6 left-5 z-20"><Joystick big={prefs.bigControls} onChange={setSteerTouch} /></div>
          <div className="absolute bottom-6 right-5 z-20 flex items-end gap-3">
            <PedalBtn label="BRAKE" tone="brake" big={prefs.bigControls} onDown={() => pedal('brake', true)} onUp={() => pedal('brake', false)} />
            <PedalBtn label="GAS" tone="gas" big={prefs.bigControls} onDown={() => pedal('throttle', true)} onUp={() => pedal('throttle', false)} />
          </div>
        </>
      )}

      {/* Desktop hint */}
      {!isTouchDevice() && started && (
        <div className="absolute bottom-3 right-3 z-20 rounded-xl bg-black/45 px-3 py-2 text-[11px] text-white/80 backdrop-blur">
          <b>W</b>/<b>S</b> gas·brake · <b>A</b>/<b>D</b> steer · <b>Space</b> handbrake · <b>1</b>/<b>2</b>/<b>3</b> views
        </div>
      )}

      {isTouchDevice() && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/80 backdrop-blur">
          <RotateCw className="mr-1 inline h-3 w-3" /> Rotate to landscape for the best view
        </div>
      )}
    </div>
  );
}

/* ------------------------- On-screen joystick ------------------------- */
function Joystick({ onChange, big }: { onChange: (v: number) => void; big?: boolean }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState(0);
  const active = useRef(false);
  const size = big ? 150 : 124;
  const radius = size / 2 - (big ? 26 : 22);

  const move = (clientX: number) => {
    const el = baseRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    let dx = clientX - cx; dx = Math.max(-radius, Math.min(radius, dx));
    setKnob(dx); onChange(dx / radius);
  };
  const end = () => { active.current = false; setKnob(0); onChange(0); };

  return (
    <div
      ref={baseRef}
      className="relative touch-none rounded-full border border-white/20 bg-black/35 backdrop-blur"
      style={{ width: size, height: size }}
      onPointerDown={(e) => { active.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (active.current) move(e.clientX); }}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={() => { if (active.current) end(); }}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-widest text-white/40">steer</div>
      <div
        className="pointer-events-none absolute top-1/2 grid place-items-center rounded-full bg-white/85 text-black shadow-lg"
        style={{ width: big ? 62 : 52, height: big ? 62 : 52, left: '50%', transform: `translate(calc(-50% + ${knob}px), -50%)` }}
      >
        <span className="text-lg">⟵⟶</span>
      </div>
    </div>
  );
}

/* ------------------------- Pedal button ------------------------- */
function PedalBtn({ label, tone, big, onDown, onUp }: { label: string; tone: 'gas' | 'brake'; big?: boolean; onDown: () => void; onUp: () => void }) {
  const cls = tone === 'gas' ? 'bg-go/85 active:bg-go shadow-go/30' : 'bg-red-600/85 active:bg-red-600 shadow-red-600/30';
  const dim = big ? 'h-28 w-24 text-base' : 'h-24 w-20 text-sm';
  return (
    <button
      className={`flex select-none items-center justify-center rounded-2xl font-bold leading-none text-white shadow-lg backdrop-blur ${cls} ${dim}`}
      onPointerDown={(e) => { e.preventDefault(); onDown(); }}
      onPointerUp={(e) => { e.preventDefault(); onUp(); }}
      onPointerLeave={() => onUp()}
      onPointerCancel={() => onUp()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
