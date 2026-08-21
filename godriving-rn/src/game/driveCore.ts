// Renderer-agnostic driving-school engine shared by the native top-down (2D)
// and the native 3D screens. Holds the world layout, car physics and the
// task/mission logic so both renderers behave identically.

export type MissionId = 'free' | 'lane' | 'roundabout' | 'parking' | 'threepoint';

export interface Car { x: number; z: number; yaw: number; speed: number }
export interface Controls { throttle: number; brake: number; steer: number; handbrake: boolean }
export interface MissionState {
  step: number; hold: number; acc: number; lastAng: number | null; entered: boolean;
  parkT: number; reversals: number; lastSpeedSign: number; startFwdX: number;
  awarded: boolean; doneAt: number;
}
export interface MissionHud { step: number; status: string; progress: number; done: boolean }

/* ---- world layout (metres) ---- */
export const W = {
  xMin: -70, xMax: 70, zMin: -100, zMax: 20,
  rb: { x: 0, z: -64, island: 11, kerb: 12, out: 19 },
  laneX: [-6, 0, 6], laneTargetX: 6, laneZ: { top: 16, bottom: -32 },
  bayX: 48, baysZ: [-46, -52, -58, -64, -70], bayTargetZ: -58, laneParkX: 40,
  ch: { xMin: -66, xMax: -42, zMin: -60, zMax: -52 },
  maxSpeed: 16, reverse: -6,
};

export const MISSIONS: { id: MissionId; title: string; desc: string; icon: string }[] = [
  { id: 'free', title: 'Free Drive', desc: 'Roam the training ground', icon: 'map' },
  { id: 'lane', title: 'Lane Change', desc: 'Move across to the target lane', icon: 'swap-horizontal' },
  { id: 'roundabout', title: 'Roundabout', desc: 'Go around, take the marked exit', icon: 'sync' },
  { id: 'parking', title: 'Bay Parking', desc: 'Park fully inside the bay', icon: 'car' },
  { id: 'threepoint', title: '3-Point Turn', desc: 'Turn to face the opposite way', icon: 'return-down-back' },
];

export const START_POSE: Record<MissionId, { x: number; z: number; yaw: number }> = {
  free: { x: 0, z: 12, yaw: 0 },
  lane: { x: 0, z: 14, yaw: 0 },
  roundabout: { x: 0, z: -40, yaw: 0 },
  parking: { x: W.laneParkX, z: -42, yaw: 0 },
  threepoint: { x: -50, z: -56, yaw: -Math.PI / 2 },
};
export const TARGET_POS: Record<MissionId, { x: number; z: number } | null> = {
  free: null,
  lane: { x: W.laneTargetX, z: -10 },
  roundabout: { x: W.rb.x + W.rb.out + 5, z: W.rb.z },
  parking: { x: W.bayX, z: W.bayTargetZ },
  threepoint: { x: W.ch.xMin + 2, z: (W.ch.zMin + W.ch.zMax) / 2 },
};
export const STEPS: Record<MissionId, string[]> = {
  free: [],
  lane: ['Build up to a steady speed', 'Signal & move into the RIGHT lane', 'Straighten up and hold it'],
  roundabout: ['Approach & give way', 'Enter and follow it around', 'Leave at the marked exit'],
  parking: ['Drive up to the highlighted bay', 'Turn in and line up straight', 'Stop fully inside the bay'],
  threepoint: ['Pull forward toward the kerb', 'Reverse back, steering the other way', 'Pull forward — now facing back'],
};
export const INTRO: Record<MissionId, string> = {
  free: 'Explore the course. Pick a task from the top to practise it.',
  lane: 'Get moving, then change one lane to your right and hold it steady.',
  roundabout: 'Head into the roundabout, follow it round and leave at the green exit.',
  parking: 'Pull into the highlighted bay and stop fully inside the lines.',
  threepoint: 'Use forward–reverse–forward to turn the car around inside the cones.',
};

export function norm(a: number) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

export interface Cone { x: number; z: number }
export function buildCones(): Cone[] {
  const cones: Cone[] = [];
  // parking bay wheel-stops (front corners)
  cones.push({ x: W.bayX + 2.6, z: W.bayTargetZ - 1.5 }, { x: W.bayX + 2.6, z: W.bayTargetZ + 1.5 });
  // 3-point channel — two rows
  for (let x = W.ch.xMin + 1; x <= W.ch.xMax; x += 3.2) { cones.push({ x, z: W.ch.zMin + 0.4 }, { x, z: W.ch.zMax - 0.4 }); }
  return cones;
}

export function newMissionState(car: Car): MissionState {
  return { step: 0, hold: 0, acc: 0, lastAng: null, entered: false, parkT: 0, reversals: 0, lastSpeedSign: 0, startFwdX: Math.sin(car.yaw), awarded: false, doneAt: 0 };
}

/** Advance the car one frame. Returns true if a cone was freshly knocked (for haptics). */
export function stepCar(car: Car, c: Controls, dt: number, cones: Cone[], knocked: boolean[]): boolean {
  if (c.throttle > 0 && c.brake === 0) car.speed += (car.speed < 0 ? 16 : 8) * c.throttle * dt;
  else if (c.brake > 0) { if (car.speed > 0) car.speed -= 16 * c.brake * dt; else car.speed -= 8 * c.brake * dt; }
  else { const drag = 3 * dt; if (car.speed > drag) car.speed -= drag; else if (car.speed < -drag) car.speed += drag; else car.speed = 0; }
  if (c.handbrake) { car.speed *= Math.pow(0.02, dt); if (Math.abs(car.speed) < 0.2) car.speed = 0; }
  car.speed = Math.max(W.reverse, Math.min(W.maxSpeed, car.speed));

  const turnAuth = Math.min(1, Math.abs(car.speed) / 3.5);
  car.yaw += c.steer * 2.0 * dt * turnAuth * Math.sign(car.speed || 1);

  const fx = Math.sin(car.yaw), fz = -Math.cos(car.yaw);
  car.x += fx * car.speed * dt; car.z += fz * car.speed * dt;

  if (car.x < W.xMin) { car.x = W.xMin; car.speed *= 0.6; }
  if (car.x > W.xMax) { car.x = W.xMax; car.speed *= 0.6; }
  if (car.z < W.zMin) { car.z = W.zMin; car.speed *= 0.6; }
  if (car.z > W.zMax) { car.z = W.zMax; car.speed *= 0.6; }

  const dO = Math.hypot(car.x - W.rb.x, car.z - W.rb.z);
  if (dO < W.rb.kerb + 1) { const nx = (car.x - W.rb.x) / (dO || 1), nz = (car.z - W.rb.z) / (dO || 1); car.x = W.rb.x + nx * (W.rb.kerb + 1); car.z = W.rb.z + nz * (W.rb.kerb + 1); car.speed *= 0.5; }

  let hit = false;
  for (let i = 0; i < cones.length; i++) {
    if (knocked[i]) continue;
    if (Math.hypot(cones[i].x - car.x, cones[i].z - car.z) < 1.15) { knocked[i] = true; car.speed *= 0.8; hit = true; }
  }
  return hit;
}

export function gearOf(speed: number) { return speed > 0.5 ? 'D' : speed < -0.5 ? 'R' : 'N'; }

export function updateMission(id: MissionId, car: Car, ms: MissionState, dt: number): MissionHud {
  const fwdX = Math.sin(car.yaw);
  const kmh = Math.abs(car.speed) * 3.6;
  let step = ms.step, status = '', progress = 0, done = false;

  if (id === 'lane') {
    if (kmh < 8) { step = 0; status = 'Build up to a steady speed (8+ km/h)'; ms.hold = 0; }
    else {
      const inTarget = Math.abs(car.x - W.laneTargetX) < 1.5;
      const aligned = Math.abs(norm(car.yaw)) < 0.2;
      if (inTarget && aligned) { ms.hold += dt; step = 2; progress = Math.min(1, ms.hold / 1.8); status = `Hold it steady… ${Math.max(0, Math.ceil(1.8 - ms.hold))}s`; if (ms.hold >= 1.8) done = true; }
      else { step = 1; ms.hold = 0; status = 'Signal, check your blind spot, then move into the RIGHT lane'; }
    }
  } else if (id === 'roundabout') {
    const dx = car.x - W.rb.x, dz = car.z - W.rb.z, dist = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
    if (!ms.entered) {
      if (dist < W.rb.out && dist > W.rb.island) { ms.entered = true; ms.lastAng = ang; step = 1; }
      else { step = 0; status = 'Approach the roundabout and slow down'; }
    }
    if (ms.entered) {
      if (ms.lastAng != null) ms.acc += norm(ang - ms.lastAng);
      ms.lastAng = ang;
      progress = Math.min(1, Math.abs(ms.acc) / (1.2 * Math.PI));
      step = progress > 0.5 ? 2 : 1;
      status = `Follow it around… ${Math.round(progress * 100)}%`;
      if (dist > W.rb.out + 3) {
        if (Math.abs(ms.acc) >= 1.2 * Math.PI) { done = true; status = 'Nicely done!'; }
        else { ms.entered = false; ms.acc = 0; ms.lastAng = null; status = 'You left too early — go back around'; }
      }
    }
  } else if (id === 'parking') {
    const inBay = Math.abs(car.x - W.bayX) < 2.7 && Math.abs(car.z - W.bayTargetZ) < 1.5;
    const alignedEW = Math.abs(fwdX) > 0.9;
    const stopped = Math.abs(car.speed) < 0.5;
    if (inBay && alignedEW && stopped) { ms.parkT += dt; step = 2; progress = Math.min(1, ms.parkT / 1.2); status = `Hold the brake… ${Math.max(0, Math.ceil(1.2 - ms.parkT))}s`; if (ms.parkT >= 1.2) done = true; }
    else if (inBay) { ms.parkT = 0; step = 1; status = alignedEW ? 'Come to a complete stop' : 'Straighten up inside the bay'; }
    else { ms.parkT = 0; step = 0; status = 'Drive up and turn into the highlighted bay'; }
  } else if (id === 'threepoint') {
    const within = car.x > W.ch.xMin - 1 && car.x < W.ch.xMax + 2 && car.z > W.ch.zMin - 1 && car.z < W.ch.zMax + 1;
    const ss = car.speed > 0.5 ? 1 : car.speed < -0.5 ? -1 : 0;
    if (ss !== 0 && ms.lastSpeedSign !== 0 && ss !== ms.lastSpeedSign) ms.reversals++;
    if (ss !== 0) ms.lastSpeedSign = ss;
    const facingBack = fwdX * ms.startFwdX < -0.85;
    step = Math.min(2, ms.reversals);
    if (!within) status = 'Stay within the cones';
    else if (facingBack && Math.abs(car.speed) < 0.8) { done = true; status = 'Turned around!'; }
    else status = `Forward → reverse → forward · point ${Math.min(3, ms.reversals + 1)}/3`;
  } else {
    return { step: 0, status: INTRO.free, progress: 0, done: false };
  }

  ms.step = step;
  if (done && !ms.awarded) { ms.awarded = true; ms.doneAt = Date.now(); }
  return { step, status, progress: done ? 1 : progress, done: ms.awarded };
}

/** Score for a completed task (feeds submitScore for XP/coins). */
export function taskScore(id: MissionId, seconds: number, cleanConeRun: boolean) {
  const base = { lane: 300, roundabout: 500, parking: 450, threepoint: 550, free: 0 }[id] || 300;
  const timeBonus = Math.max(0, Math.round(200 - seconds * 6));
  return base + timeBonus + (cleanConeRun ? 150 : 0);
}
