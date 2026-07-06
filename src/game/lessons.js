/* GoDriving lesson games — ported from the original vanilla lessons.
 * Each factory: createLesson(engine, rt) -> { start(difficulty), destroy() }
 * rt = { difficulty, setScore, setRound, setBest, notify, finish }
 */

function timerBag() {
  const ids = new Set();
  return {
    later(fn, ms) { const id = setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); return id; },
    every(fn, ms) { const id = setInterval(fn, ms); ids.add(id); return id; },
    clearAll() { for (const id of ids) { clearTimeout(id); clearInterval(id); } ids.clear(); },
  };
}

/* ============================ PARKING ============================ */
function createParking(g, rt) {
  const TOTAL_ROUNDS = 5;
  const DIFF = {
    easy: { parkedSpots: [0, 3, 5, 8, 10], coachMs: 700, label: 'Easy' },
    medium: { parkedSpots: [0, 1, 3, 5, 6, 8, 10, 11], coachMs: 1100, label: 'Medium' },
    hard: { parkedSpots: [0, 1, 2, 3, 5, 6, 7, 8, 10, 11], coachMs: 1500, label: 'Hard' },
  };
  let difficulty = 'medium';
  let currentRound = 0, totalScore = 0, bestRound = 0, roundStartedAt = 0;
  let targetSpotIdx = 0, parkedHold = 0, courseCorrections = 0, lastDirection = 0;
  let lastTip = 0;
  const timers = timerBag();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function pickSpotFar(occupied) {
    const free = [];
    for (let i = 0; i < g.PARK.spots.length; i++) if (!occupied.includes(i)) free.push(i);
    free.sort((a, b) => {
      const sa = g.PARK.spots[a], sb = g.PARK.spots[b];
      const da = g.dist(g.car.x, g.car.y, sa.x + sa.w / 2, sa.y + sa.h / 2);
      const db = g.dist(g.car.x, g.car.y, sb.x + sb.w / 2, sb.y + sb.h / 2);
      return db - da;
    });
    return free[Math.floor(Math.random() * Math.min(3, free.length))];
  }

  function computeRoundScore() {
    const t = g.PARK.spots[targetSpotIdx];
    const c = g.car;
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    const offset = g.dist(c.x, c.y, cx, cy);
    const centerPts = Math.max(0, 40 - Math.round(offset * 0.7));
    const da = Math.min(Math.abs(g.norm(c.heading - t.facing)), Math.abs(g.norm(c.heading - t.facing + Math.PI)));
    const headingPts = Math.max(0, 30 - Math.round((da / 0.6) * 30));
    const seconds = (performance.now() - roundStartedAt) / 1000;
    const timePts = clamp(Math.round(30 - (seconds - 12) * 1.7), 0, 30);
    const ccPenalty = Math.max(0, courseCorrections - 2) * 5;
    return Math.max(0, centerPts + headingPts + timePts - ccPenalty);
  }

  function nextRound() {
    currentRound++;
    if (currentRound > TOTAL_ROUNDS) { showEnd(); return; }
    const occupied = DIFF[difficulty].parkedSpots.slice();
    if (!occupied.includes(7)) occupied.push(7);
    if (targetSpotIdx != null) occupied.push(targetSpotIdx);
    targetSpotIdx = pickSpotFar(occupied) ?? 4;
    g.PARK.spots.forEach((s) => (s.highlight = false));
    g.PARK.spots[targetSpotIdx].highlight = true;
    parkedHold = 0; courseCorrections = 0; lastDirection = 0;
    roundStartedAt = performance.now();
    const t = g.PARK.spots[targetSpotIdx];
    g.setMission({
      title: `Round ${currentRound}: park in the highlighted spot`,
      desc: 'Pull in straight, come to a complete stop. The straighter and quicker you park, the higher your score.',
      step: `<span class="pill">Round ${currentRound} of ${TOTAL_ROUNDS}</span> Difficulty: ${DIFF[difficulty].label}`,
      markers: [
        g.makeMarker(t.x + 8, t.y + 8, { color: '#fbbf24' }),
        g.makeMarker(t.x + t.w - 8, t.y + 8, { color: '#fbbf24' }),
        g.makeMarker(t.x + 8, t.y + t.h - 8, { color: '#fbbf24' }),
        g.makeMarker(t.x + t.w - 8, t.y + t.h - 8, { kind: 'finish', label: 'PARK', color: '#fbbf24' }),
      ],
      check() {
        const allHit = this.markers.every((m) => m.hit);
        if (!allHit) return false;
        const c = g.car;
        const inside = c.x > t.x && c.x < t.x + t.w && c.y > t.y && c.y < t.y + t.h;
        const stopped = Math.abs(c.speed) < 4;
        const headingOk = Math.abs(g.norm(c.heading - t.facing)) < 0.6 || Math.abs(g.norm(c.heading - t.facing + Math.PI)) < 0.6;
        if (inside && stopped && headingOk) parkedHold += 1 / 60;
        else parkedHold = 0;
        return parkedHold > 0.7;
      },
      onComplete() {
        const score = computeRoundScore();
        totalScore += score;
        if (score > bestRound) bestRound = score;
        rt.setScore(totalScore);
        rt.setBest(bestRound + '%');
        const stars = score >= 80 ? 'Perfect parking!' : score >= 60 ? 'Solid parking.' : 'Could be cleaner.';
        rt.notify(`Round ${currentRound}: ${score} pts — ${stars}`, 'success', 2200);
        g.audio.complete();
        timers.later(nextRound, 2300);
      },
    });
    rt.setRound(`${currentRound}/${TOTAL_ROUNDS}`);
  }

  function coach() {
    const now = performance.now();
    if (now - lastTip < DIFF[difficulty].coachMs) return;
    const t = g.PARK.spots[targetSpotIdx];
    if (!t || !t.highlight) return;
    const c = g.car;
    const d = g.dist(c.x, c.y, t.x + t.w / 2, t.y + t.h / 2);
    if (d < 60 && Math.abs(c.speed) > 60) { rt.notify("Slow down — you're close", 'info', 1200); lastTip = now; }
    else if (d < 100) {
      const da = Math.abs(g.norm(c.heading - t.facing));
      if (da > 0.8 && da < Math.PI - 0.8) { rt.notify('Straighten the car before you stop', 'info', 1200); lastTip = now; }
    }
  }

  function showEnd() {
    const grade = totalScore >= 400 ? 'Outstanding driving!' : totalScore >= 300 ? 'Solid effort.' : totalScore >= 200 ? 'Keep practising.' : 'Plenty of room to improve.';
    g.audio.complete();
    rt.finish({ score: totalScore, summary: grade, stats: [{ label: 'Best', value: bestRound }, { label: 'Rounds', value: TOTAL_ROUNDS }, { label: 'Level', value: DIFF[difficulty].label }] });
  }

  return {
    start(diff) {
      difficulty = diff || 'medium';
      totalScore = 0; bestRound = 0; currentRound = 0; targetSpotIdx = 0; lastTip = 0;
      timers.clearAll();
      const startSpot = g.PARK.spots[7];
      g.init({
        start: { x: startSpot.x + startSpot.w / 2, y: startSpot.y + startSpot.h / 2, heading: -Math.PI / 2 },
        zoom: 1.05, parkedSpots: DIFF[difficulty].parkedSpots, traffic: false,
        onReset: () => { g.resetCar(); parkedHold = 0; courseCorrections = 0; lastDirection = 0; rt.notify('Round reset', 'info', 1000); },
      });
      g.rememberStart();
      g.onUpdate(() => {
        const sp = g.car.speed;
        const dir = sp > 6 ? 1 : sp < -6 ? -1 : 0;
        if (lastDirection !== 0 && dir !== 0 && dir !== lastDirection) courseCorrections++;
        if (dir !== 0) lastDirection = dir;
        coach();
      });
      g.start();
      nextRound();
    },
    destroy() { timers.clearAll(); },
  };
}

/* ============================ ROUNDABOUT ============================ */
function createRoundabout(g, rt) {
  const TOTAL_ROUNDS = 4;
  const DIFF = {
    easy: { traffic: false, label: 'Easy' },
    medium: { traffic: { nbCount: 4, sbCount: 4, speedRange: [55, 90], spacing: 380 }, label: 'Medium' },
    hard: { traffic: { nbCount: 8, sbCount: 8, speedRange: [80, 120], spacing: 240 }, label: 'Hard' },
  };
  let difficulty = 'medium';
  let roundIdx = 0, totalScore = 0, correctCount = 0, wrongAttempts = 0, targetExit = 1, state = 'idle', exitOrder = [];
  const timers = timerBag();

  const shuffled = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const exitInfo = (id) => g.ROUNDABOUT.exits.find((e) => e.id === id);
  function exitMarker(id) {
    const e = exitInfo(id);
    const a = e.angle * Math.PI / 180;
    const r = g.RA_OUTER + 130;
    return { x: g.ROUNDABOUT.x + Math.cos(a) * r, y: g.ROUNDABOUT.y + Math.sin(a) * r };
  }
  function resetCarToStart() { g.resetCar(); g.car.signalLeft = false; g.car.signalRight = false; }

  function setupMission() {
    const e = exitInfo(targetExit);
    const m = exitMarker(targetExit);
    g.setMission({
      title: `Round ${roundIdx}: Take Exit ${targetExit} (${e.name})`,
      desc: `Drive north, signal ${targetExit === 4 ? '➡ continue straight' : targetExit === 1 ? '➡ right at exit 1' : '➡ left for exits 2/3'} and leave at the ${e.name.toLowerCase()} exit.`,
      step: `<span class="pill">Round ${roundIdx} of ${TOTAL_ROUNDS}</span> Difficulty: ${DIFF[difficulty].label}`,
      markers: [
        g.makeMarker(g.HW_CENTER_X + 100, g.HW_NORTH_Y + 350, { color: '#38bdf8', label: 'APPROACH' }),
        g.makeMarker(m.x, m.y, { kind: 'finish', color: '#fbbf24', label: `EXIT ${targetExit}`, r: 50 }),
      ],
      onMarker(mk) { if (mk.kind === 'finish') judgeRound(); },
      check() { return false; },
    });
  }

  function judgeRound() {
    if (state === 'judged') return;
    state = 'judged';
    const c = g.car;
    const e = exitInfo(targetExit);
    const a = e.angle * Math.PI / 180;
    const carAngle = Math.atan2(c.y - g.ROUNDABOUT.y, c.x - g.ROUNDABOUT.x);
    const correct = Math.abs(g.norm(carAngle - a)) < Math.PI / 4;
    if (correct) {
      correctCount++;
      let score = 100;
      const expectedSignal = targetExit === 1 ? 'right' : targetExit === 4 ? 'none' : 'left';
      if ((expectedSignal === 'left' && c.signalLeft) || (expectedSignal === 'right' && c.signalRight) || (expectedSignal === 'none' && !c.signalLeft && !c.signalRight)) score += 25;
      totalScore += score;
      rt.setScore(totalScore);
      rt.setBest(`${correctCount}/${TOTAL_ROUNDS}`);
      rt.notify(`Exit ${targetExit} ✓  +${score} pts`, 'success', 1700);
      g.audio.complete();
      timers.later(nextRound, 1900);
    } else {
      wrongAttempts++;
      rt.notify('Wrong exit. Resetting…', 'fail', 1800);
      g.audio.fail();
      timers.later(() => { state = 'approaching'; setupMission(); resetCarToStart(); }, 1600);
    }
  }

  function nextRound() {
    roundIdx++;
    if (roundIdx > TOTAL_ROUNDS) { showEnd(); return; }
    targetExit = exitOrder[roundIdx - 1];
    state = 'approaching';
    resetCarToStart();
    setupMission();
    rt.setRound(`${roundIdx}/${TOTAL_ROUNDS}`);
    rt.setBest(`${correctCount}/${TOTAL_ROUNDS}`);
  }

  function drawTargetCallout(ctx) {
    const e = exitInfo(targetExit); if (!e) return;
    const a = e.angle * Math.PI / 180;
    const cx = g.ROUNDABOUT.x, cy = g.ROUNDABOUT.y;
    const ax = cx + Math.cos(a) * (g.RA_INNER * 0.45);
    const ay = cy + Math.sin(a) * (g.RA_INNER * 0.45);
    const [sx, sy] = g.worldToScreen(ax, ay);
    const z = g.camera.zoom;
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(a + Math.PI / 2); ctx.scale(z, z);
    const pulse = 1 + Math.sin(performance.now() / 200) * 0.1;
    ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, -34 * pulse); ctx.lineTo(20, 8); ctx.lineTo(8, 8); ctx.lineTo(8, 34); ctx.lineTo(-8, 34); ctx.lineTo(-8, 8); ctx.lineTo(-20, 8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    const lx = cx + Math.cos(a) * (g.RA_INNER * 0.05);
    const ly = cy + Math.sin(a) * (g.RA_INNER * 0.05);
    const [tx, ty] = g.worldToScreen(lx, ly);
    ctx.save();
    ctx.font = 'bold ' + (32 * z).toFixed(1) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillStyle = '#fff';
    ctx.fillText('EXIT ' + targetExit, tx, ty);
    ctx.restore();
  }

  function showEnd() {
    const grade = correctCount === 4 ? 'Perfect! All four exits nailed.' : correctCount >= 3 ? 'Great work — almost flawless.' : correctCount >= 2 ? 'Half-way there.' : 'Keep practising — follow the call-out arrow.';
    g.audio.complete();
    rt.finish({ score: totalScore, summary: grade, stats: [{ label: 'Correct', value: `${correctCount}/${TOTAL_ROUNDS}` }, { label: 'Wrong', value: wrongAttempts }, { label: 'Level', value: DIFF[difficulty].label }] });
  }

  return {
    start(diff) {
      difficulty = diff || 'medium';
      totalScore = 0; correctCount = 0; wrongAttempts = 0; roundIdx = 0;
      exitOrder = shuffled([1, 2, 3, 4]);
      timers.clearAll();
      g.init({
        start: { x: g.HW_CENTER_X + 120, y: g.HW_SOUTH_Y - 80, heading: -Math.PI / 2 },
        zoom: 0.95, parkedSpots: [0, 3, 5, 8, 10], traffic: DIFF[difficulty].traffic,
        onReset: () => { resetCarToStart(); state = 'approaching'; setupMission(); rt.notify('Round reset', 'info', 1000); },
      });
      g.rememberStart();
      g.onPreRender(drawTargetCallout);
      g.start();
      nextRound();
    },
    destroy() { timers.clearAll(); },
  };
}

/* ============================ LANE CHANGE ============================ */
function createLaneChange(g, rt) {
  const LANES_PER_RUN = 8;
  const DIFF = {
    easy: { traffic: { nbCount: 4, sbCount: 4, speedRange: [50, 80], spacing: 420 }, label: 'Easy', collisionPx: 36 },
    medium: { traffic: { nbCount: 8, sbCount: 8, speedRange: [70, 105], spacing: 280 }, label: 'Medium', collisionPx: 34 },
    hard: { traffic: { nbCount: 12, sbCount: 12, speedRange: [90, 130], spacing: 210 }, label: 'Hard', collisionPx: 32 },
  };
  let difficulty = 'medium';
  let totalScore = 0, combo = 0, bestCombo = 0, crashes = 0, targetLane = 7, lanesCleared = 0, inLaneTime = 0, collisionCooldown = 0;
  const timers = timerBag();

  const laneCenterX = (idx) => g.HW_CENTER_X + g.MEDIAN / 2 + (idx - 4) * g.LANE_WIDTH + g.LANE_WIDTH / 2;
  function currentLaneIndex() {
    for (let i = 4; i <= 7; i++) if (Math.abs(g.car.x - laneCenterX(i)) < g.LANE_WIDTH / 2) return i;
    return -1;
  }
  function pickNewTarget(prev) {
    const cand = [];
    for (let i = 4; i <= 7; i++) { if (i === prev) continue; cand.push({ i, w: 1 / (1 + Math.abs(i - prev) * 0.7) }); }
    const tot = cand.reduce((s, c) => s + c.w, 0);
    let r = Math.random() * tot;
    for (const c of cand) { r -= c.w; if (r <= 0) return c.i; }
    return cand[0].i;
  }

  function setMission() {
    const targetX = laneCenterX(targetLane);
    const ahead = g.car.y - 800;
    g.setMission({
      title: `Move into LANE ${targetLane - 3} (from the median)`,
      desc: `Signal ${targetLane < currentLaneIndex() ? 'LEFT (Q)' : 'RIGHT (E)'} first, then change lanes safely. Hold the lane for 1s to clear.`,
      step: `<span class="pill">Lane ${lanesCleared + 1} of ${LANES_PER_RUN}</span> Difficulty: ${DIFF[difficulty].label}`,
      markers: [g.makeMarker(targetX, ahead, { kind: 'finish', color: '#a855f7', label: 'TARGET LANE', r: 36 })],
      onMarker() {},
      check() { return false; },
    });
  }

  function pickNextLane() {
    if (lanesCleared >= LANES_PER_RUN) { showEnd(); return; }
    const cur = currentLaneIndex();
    targetLane = pickNewTarget(cur === -1 ? 7 : cur);
    inLaneTime = 0;
    setMission();
  }

  function clearLane() {
    lanesCleared++; combo++;
    if (combo > bestCombo) bestCombo = combo;
    let pts = 50 + (combo - 1) * 10;
    const c = g.car;
    const expectLeft = !(currentLaneIndex() < targetLane);
    if (expectLeft ? c.signalLeft : c.signalRight) pts += 25;
    totalScore += pts;
    rt.setScore(totalScore);
    rt.setBest('×' + combo);
    rt.notify(`Lane cleared!  +${pts} (combo ×${combo})`, 'success', 1300);
    g.audio.checkpoint();
    c.signalLeft = false; c.signalRight = false;
    timers.later(pickNextLane, 600);
  }

  function registerCrash() {
    crashes++; combo = 0; collisionCooldown = 1.5;
    rt.setBest('×0');
    rt.notify('Collision! Combo reset.', 'fail', 1500);
    g.audio.crash();
    g.car.speed *= 0.4;
  }

  function perFrame(dt) {
    const mission = g._mission;
    if (mission && mission.markers && mission.markers[0]) {
      mission.markers[0].x = laneCenterX(targetLane);
      mission.markers[0].y = Math.min(mission.markers[0].y, g.car.y - 600);
      mission.markers[0].hit = false;
    }
    const c = g.car;
    const inLane = Math.abs(c.x - laneCenterX(targetLane)) < g.LANE_WIDTH / 2;
    const moving = c.speed > 30;
    if (inLane && moving) inLaneTime += dt;
    else inLaneTime = Math.max(0, inLaneTime - dt * 0.5);
    if (inLaneTime >= 1.0) clearLane();

    if (collisionCooldown > 0) collisionCooldown -= dt;
    else {
      for (const t of g.TRAFFIC) {
        if (g.dist(c.x, c.y, t.x, t.y) < DIFF[difficulty].collisionPx + 18) { registerCrash(); break; }
      }
    }
    if (c.x < g.HW_CENTER_X + g.MEDIAN / 2 + 4) { c.x = g.HW_CENTER_X + g.MEDIAN / 2 + 6; c.speed = Math.min(c.speed, 60); }
    if (c.x > g.HW_CENTER_X + g.HW_HALF - 4) { c.x = g.HW_CENTER_X + g.HW_HALF - 6; c.speed = Math.min(c.speed, 60); }
    if (c.y < g.HW_NORTH_Y + 400) c.y = g.HW_SOUTH_Y - 300;
  }

  function drawTargetOverlay(ctx) {
    const z = g.camera.zoom;
    const [sx] = g.worldToScreen(laneCenterX(targetLane), g.car.y - 200);
    const H = g.height;
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.05 * Math.sin(performance.now() / 160);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(168, 85, 247, 0)');
    grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.6)');
    grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - (g.LANE_WIDTH / 2) * z, 0, g.LANE_WIDTH * z, H);
    ctx.restore();
    ctx.save();
    ctx.translate(sx, 120);
    ctx.fillStyle = '#a855f7'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 16;
    const pulse = 1 + Math.sin(performance.now() / 200) * 0.1;
    ctx.beginPath();
    ctx.moveTo(0, 28 * pulse); ctx.lineTo(20, -4); ctx.lineTo(8, -4); ctx.lineTo(8, -22); ctx.lineTo(-8, -22); ctx.lineTo(-8, -4); ctx.lineTo(-20, -4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function showEnd() {
    const summary = bestCombo >= 6 ? 'Excellent lane discipline!' : bestCombo >= 3 ? 'Good run.' : 'Practise smoother changes.';
    g.audio.complete();
    rt.finish({ score: totalScore, summary, stats: [{ label: 'Best combo', value: bestCombo }, { label: 'Crashes', value: crashes }, { label: 'Level', value: DIFF[difficulty].label }] });
  }

  return {
    start(diff) {
      difficulty = diff || 'medium';
      totalScore = 0; combo = 0; bestCombo = 0; crashes = 0; lanesCleared = 0; inLaneTime = 0; collisionCooldown = 0;
      timers.clearAll();
      g.init({
        start: { x: laneCenterX(7), y: g.HW_SOUTH_Y - 350, heading: -Math.PI / 2 },
        zoom: 1.0, parkedSpots: [0, 3, 5, 8, 10], traffic: DIFF[difficulty].traffic,
        onReset: () => { combo = 0; rt.setBest('×0'); rt.notify('Reset', 'info', 800); },
      });
      g.rememberStart();
      g.car.speed = 80;
      g.onUpdate(perFrame);
      g.onPostRender(drawTargetOverlay);
      g.start();
      pickNextLane();
    },
    destroy() { timers.clearAll(); },
  };
}

/* ============================ EMERGENCY STOP ============================ */
function createEmergency(g, rt) {
  const TOTAL_ROUNDS = 5;
  const DIFF = {
    easy: { speedKmh: 60, collDist: 28, label: 'Easy' },
    medium: { speedKmh: 80, collDist: 28, label: 'Medium' },
    hard: { speedKmh: 110, collDist: 28, label: 'Hard' },
  };
  let difficulty = 'medium';
  let roundIdx = 0, totalScore = 0, bestRt = Infinity, hits = 0;
  let cones = [], state = 'idle', armTimer = 0, hazardSpawnTime = 0, brakeStartTime = 0, collided = false, roundDone = false;
  const timers = timerBag();

  function nextRound() {
    roundIdx++;
    if (roundIdx > TOTAL_ROUNDS) { showEnd(); return; }
    state = 'accelerating'; cones = []; collided = false; roundDone = false; hazardSpawnTime = 0; brakeStartTime = 0;
    g.resetCar();
    rt.setRound(`${roundIdx}/${TOTAL_ROUNDS}`);
    g.setMission({
      title: `Round ${roundIdx}: get to ${DIFF[difficulty].speedKmh} km/h`,
      desc: 'Hold W to build up to the target speed. A hazard will appear when you least expect it.',
      step: `<span class="pill">Round ${roundIdx} of ${TOTAL_ROUNDS}</span> Difficulty: ${DIFF[difficulty].label}`,
      markers: [], check() { return false; },
    });
  }

  function spawnHazard() {
    const c = g.car;
    const aheadDist = 220 + Math.random() * 80;
    const fx = c.x + Math.cos(c.heading) * aheadDist;
    const fy = c.y + Math.sin(c.heading) * aheadDist;
    const px = -Math.sin(c.heading), py = Math.cos(c.heading);
    const spread = 36;
    for (let i = -2; i <= 2; i++) cones.push({ x: fx + px * i * spread, y: fy + py * i * spread, hit: false });
    hazardSpawnTime = performance.now();
    state = 'reacting';
    rt.notify('⚠ HAZARD!', 'fail', 1500);
    g.audio.buzz();
    g.setMission({ title: '🛑 Stop NOW', desc: 'Brake to a complete stop before hitting the cones.', step: `<span class="pill">Round ${roundIdx} of ${TOTAL_ROUNDS}</span> REACT!`, markers: [], check() { return false; } });
  }

  function finishRound(success) {
    roundDone = true; state = 'done';
    let pts = 0;
    if (success) {
      hits++;
      const rtime = brakeStartTime > 0 ? brakeStartTime - hazardSpawnTime : 9999;
      const rtPenalty = Math.max(0, Math.min(60, (rtime - 250) / 12));
      const closest = Math.min(...cones.map((co) => g.dist(g.car.x, g.car.y, co.x, co.y)));
      const distBonus = closest < 60 ? 20 : closest < 100 ? 10 : 0;
      pts = Math.max(20, Math.round(100 - rtPenalty + distBonus));
      totalScore += pts;
      rt.notify(`Stopped safely! +${pts} pts`, 'success', 2000);
      g.audio.complete();
    } else {
      rt.notify('Hit the hazard. 0 pts.', 'fail', 2000);
      g.audio.crash();
    }
    rt.setScore(totalScore);
    timers.later(nextRound, 2200);
  }

  function perFrame(dt) {
    const c = g.car;
    const speedKmh = Math.abs(c.speed) * 0.36;
    if (state === 'reacting' && brakeStartTime === 0) {
      if (g.keys.KeyS || g.keys.ArrowDown || g.keys.Space) {
        brakeStartTime = performance.now();
        const rtime = brakeStartTime - hazardSpawnTime;
        if (rtime < bestRt) bestRt = rtime;
        rt.setBest(`${Math.round(rtime)}ms`);
      }
    }
    if (state === 'accelerating') {
      if (speedKmh >= DIFF[difficulty].speedKmh - 5) { state = 'armed'; armTimer = 0.8 + Math.random() * 2.2; }
    } else if (state === 'armed') {
      armTimer -= dt;
      if (armTimer <= 0) spawnHazard();
    } else if (state === 'reacting') {
      for (const co of cones) {
        if (co.hit) continue;
        if (g.dist(c.x, c.y, co.x, co.y) < DIFF[difficulty].collDist) { co.hit = true; collided = true; }
      }
      if (collided && !roundDone) finishRound(false);
      else if (Math.abs(c.speed) < 4 && !roundDone) finishRound(true);
    }
  }

  function showEnd() {
    const summary = hits === 5 ? 'Lightning reflexes — perfect round!' : hits >= 3 ? 'Solid braking.' : 'Practise scanning further ahead.';
    g.audio.complete();
    rt.finish({ score: totalScore, summary, stats: [{ label: 'Best RT', value: bestRt === Infinity ? '—' : `${Math.round(bestRt)}ms` }, { label: 'Stops', value: `${hits}/${TOTAL_ROUNDS}` }, { label: 'Level', value: DIFF[difficulty].label }] });
  }

  return {
    start(diff) {
      difficulty = diff || 'medium';
      totalScore = 0; bestRt = Infinity; hits = 0; roundIdx = 0;
      timers.clearAll();
      g.init({
        start: { x: g.HW_CENTER_X + 120, y: g.HW_SOUTH_Y - 100, heading: -Math.PI / 2 },
        zoom: 0.95, parkedSpots: [0, 3, 5, 8, 10], traffic: false,
        onReset: () => { cones = []; collided = false; roundDone = false; state = 'accelerating'; hazardSpawnTime = 0; brakeStartTime = 0; g.resetCar(); rt.notify('Round reset', 'info', 800); },
      });
      g.rememberStart();
      g.onUpdate(perFrame);
      g.onDrawObjects(() => { for (const co of cones) g.drawCone(co); });
      g.start();
      nextRound();
    },
    destroy() { timers.clearAll(); },
  };
}

/* ============================ NIGHT DRIVE ============================ */
function createNight(g, rt) {
  const DIFF = {
    easy: { dark: 0.65, range: 480, ambient: 110, fog: 0.25, label: 'Clear night' },
    medium: { dark: 0.82, range: 380, ambient: 80, fog: 0.45, label: 'Misty' },
    hard: { dark: 0.93, range: 290, ambient: 55, fog: 0.6, label: 'Pitch black' },
  };
  let difficulty = 'medium';
  let runStartTime = 0, resets = 0, cleared = 0;
  const totalCheckpoints = 5;
  const timers = timerBag();

  function setupMission() {
    const mk = (x, y, opts = {}) => g.makeMarker(x, y, Object.assign({ color: '#fde047', r: 36 }, opts));
    const markers = [
      mk(g.PARK_ROAD.x, g.PARK_ROAD.yTop + 80, { label: '1' }),
      mk(g.HW_CENTER_X + 150, -600, { label: '2' }),
      mk(g.HW_CENTER_X + 100, g.HW_NORTH_Y + 250, { label: '3' }),
      mk(g.ROUNDABOUT.x + g.RA_OUTER + 100, g.ROUNDABOUT.y, { label: '4' }),
      mk(g.ROUNDABOUT.x + 700, g.ROUNDABOUT.y, { kind: 'finish', label: 'FINISH', color: '#fef08a', r: 50 }),
    ];
    g.setMission({
      title: 'Drive through the night',
      desc: 'Hit each glowing checkpoint in order. Take it easy in the dark.',
      step: `<span class="pill">${DIFF[difficulty].label}</span> 5 checkpoints`,
      markers,
      onMarker(m) { cleared++; rt.setScore(cleared * 100); rt.setRound(`${cleared}/${totalCheckpoints}`); if (m.kind === 'finish') finish(); },
      check() { return false; },
    });
  }

  function finish() {
    const seconds = ((performance.now() - runStartTime) / 1000).toFixed(1);
    const summary = resets === 0 ? 'Smooth, calm and confident!' : resets <= 2 ? 'Solid run — small wobble.' : 'You made it. Try a clearer night next time.';
    g.audio.complete();
    rt.finish({ score: cleared * 100, summary, stats: [{ label: 'Time', value: seconds + 's' }, { label: 'Resets', value: resets }, { label: 'Sky', value: DIFF[difficulty].label }] });
  }

  function drawNight(ctx) {
    const cfg = DIFF[difficulty];
    const car = g.car, cam = g.camera;
    const [px, py] = g.worldToScreen(car.x, car.y);
    const W = g.width, H = g.height;
    const range = cfg.range * cam.zoom;
    const halfAngle = 0.55;
    const heading = car.heading;
    ctx.save();
    ctx.fillStyle = `rgba(2, 6, 23, ${cfg.dark})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(px, py, 30, px, py, range);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.65)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, range, heading - halfAngle, heading + halfAngle); ctx.closePath(); ctx.fill();
    const grad2 = ctx.createRadialGradient(px, py, 5, px, py, cfg.ambient * cam.zoom);
    grad2.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad2;
    ctx.beginPath(); ctx.arc(px, py, cfg.ambient * cam.zoom, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const tint = ctx.createRadialGradient(px, py, 30, px, py, range);
    tint.addColorStop(0, 'rgba(254, 240, 138, 0.16)');
    tint.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = tint;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, range, heading - halfAngle, heading + halfAngle); ctx.closePath(); ctx.fill();
    const vignette = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, Math.max(W, H) / 1.4);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, `rgba(2, 6, 23, ${cfg.fog})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const mission = g._mission;
    if (mission && mission.markers) {
      for (const m of mission.markers) g.drawMarker(m);
      const next = mission.markers.find((m) => !m.hit);
      if (next) {
        const [sx, sy] = g.worldToScreen(next.x, next.y);
        const margin = 100;
        if (sx < margin || sx > W - margin || sy < margin || sy > H - margin) {
          const ang = Math.atan2(sy - H / 2, sx - W / 2);
          const r = Math.min(W, H) / 2 - 110;
          const ix = W / 2 + Math.cos(ang) * r, iy = H / 2 + Math.sin(ang) * r;
          ctx.save();
          ctx.translate(ix, iy); ctx.rotate(ang);
          ctx.fillStyle = '#fde047'; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-26, -14); ctx.lineTo(-16, 0); ctx.lineTo(-26, 14); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  return {
    start(diff) {
      difficulty = diff || 'medium';
      cleared = 0; resets = 0; runStartTime = performance.now();
      timers.clearAll();
      const startSpot = g.PARK.spots[7];
      g.init({
        start: { x: startSpot.x + startSpot.w / 2, y: startSpot.y + startSpot.h / 2, heading: -Math.PI / 2 },
        zoom: 1.0, parkedSpots: [0, 3, 5, 8, 10], traffic: { nbCount: 4, sbCount: 4, speedRange: [55, 90], spacing: 380 },
        onReset: () => { resets++; g.resetCar(); rt.notify('Reset', 'info', 800); },
      });
      g.rememberStart();
      g.onPostRender(drawNight);
      g.start();
      rt.setRound(`0/${totalCheckpoints}`);
      setupMission();
    },
    destroy() { timers.clearAll(); },
  };
}

/* ============================ THREE-POINT TURN ============================ */
function createReverse(g, rt) {
  const DIFF = {
    easy: { width: 240, length: 320, label: 'Easy' },
    medium: { width: 200, length: 280, label: 'Medium' },
    hard: { width: 170, length: 240, label: 'Hard' },
  };
  let difficulty = 'medium';
  let cones = [], movements = 0, lastDir = 0, conesHit = 0, startHeading = 0, completed = false;
  const timers = timerBag();

  function buildCones(cx, cy) {
    cones = [];
    const w = DIFF[difficulty].width, l = DIFF[difficulty].length;
    for (let i = -w / 2; i <= w / 2; i += 30) cones.push({ x: cx + l / 2, y: cy + i, hit: false });
    for (let i = -w / 2; i <= w / 2; i += 30) cones.push({ x: cx - l / 2, y: cy + i, hit: false });
    for (let i = -l / 2 + 30; i < l / 2; i += 30) { cones.push({ x: cx + i, y: cy - w / 2, hit: false }); cones.push({ x: cx + i, y: cy + w / 2, hit: false }); }
  }

  function completeRound() {
    completed = true;
    const pts = Math.max(0, 100 - Math.max(0, (movements - 3) * 10) - conesHit * 15);
    rt.notify(`Three-point turn complete!  +${pts} pts`, 'success', 2200);
    g.audio.complete();
    timers.later(() => showEnd(pts), 2300);
  }

  function perFrame() {
    const c = g.car;
    const dir = c.speed > 8 ? 1 : c.speed < -8 ? -1 : 0;
    if (lastDir !== 0 && dir !== 0 && dir !== lastDir) { movements++; rt.setScore(movements); }
    if (dir !== 0) lastDir = dir;
    for (const co of cones) {
      if (co.hit) continue;
      if (g.dist(c.x, c.y, co.x, co.y) < 26) { co.hit = true; conesHit++; rt.setBest(`${conesHit} hit`); g.audio.buzz(); rt.notify('Cone hit!', 'fail', 700); c.speed *= 0.5; }
    }
    if (!completed) {
      const da = Math.abs(g.norm(c.heading - (startHeading + Math.PI)));
      if (da < 0.45 && Math.abs(c.speed) < 6 && movements >= 1) completeRound();
    }
  }

  function drawTurnArea(ctx) {
    const sideRoad = g.SIDE_ROADS[0];
    const cx = sideRoad.x2 - 200, cy = sideRoad.y1;
    const w = DIFF[difficulty].width, l = DIFF[difficulty].length;
    const [x1, y1] = g.worldToScreen(cx - l / 2, cy - w / 2);
    const [x2, y2] = g.worldToScreen(cx + l / 2, cy + w / 2);
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 2 * g.camera.zoom;
    ctx.setLineDash([8 * g.camera.zoom, 6 * g.camera.zoom]);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.setLineDash([]);
    const [sx, sy] = g.worldToScreen(cx + l / 2 + 40, cy);
    const z = g.camera.zoom;
    const sw = 90 * z, sh = 50 * z;
    ctx.fillStyle = '#dc2626'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * z;
    g.roundRect(ctx, sx - sw / 2, sy - sh / 2, sw, sh, 6 * z);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (12 * z).toFixed(1) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ROAD', sx, sy - 8 * z);
    ctx.fillText('CLOSED', sx, sy + 8 * z);
    ctx.restore();
  }

  function showEnd(pts) {
    const summary = movements <= 3 && conesHit === 0 ? 'Textbook three-point turn!' : movements <= 5 && conesHit <= 2 ? 'Good effort — tighten it up.' : 'A bit messy — try the wide setting.';
    rt.finish({ score: pts, summary, stats: [{ label: 'Moves', value: movements }, { label: 'Cones', value: conesHit }, { label: 'Level', value: DIFF[difficulty].label }] });
  }

  return {
    start(diff) {
      difficulty = diff || 'medium';
      movements = 0; lastDir = 0; conesHit = 0; completed = false;
      timers.clearAll();
      const sideRoad = g.SIDE_ROADS[0];
      const startX = sideRoad.x2 - 200, startY = sideRoad.y1;
      startHeading = 0;
      g.init({ start: { x: startX, y: startY, heading: startHeading }, zoom: 1.15, parkedSpots: [0, 3, 5, 8, 10], traffic: false, onReset: () => { movements = 0; lastDir = 0; conesHit = 0; completed = false; cones.forEach((c) => (c.hit = false)); g.resetCar(); rt.setScore(0); rt.notify('Reset', 'info', 800); } });
      g.rememberStart();
      buildCones(startX, startY);
      g.onUpdate(perFrame);
      g.onDrawObjects(() => { for (const co of cones) g.drawCone(co); });
      g.onPostRender(drawTurnArea);
      g.start();
      g.setMission({ title: '↺ Make a three-point turn', desc: 'Use the cone-marked area to turn the car around so it faces back the way you came.', step: `<span class="pill">${DIFF[difficulty].label}</span> single round`, markers: [], check() { return false; } });
      rt.setScore(0);
    },
    destroy() { timers.clearAll(); },
  };
}

const DIFFS = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const baseControls = [
  { key: 'W/S', label: 'drive' },
  { key: 'A/D', label: 'steer' },
  { key: 'Q/E', label: 'signal' },
  { key: 'Space', label: 'brake' },
  { key: 'R', label: 'reset' },
];

export const LESSONS = [
  {
    id: 'drive_parking', slug: 'parking', title: 'Parking Practice', emoji: '🅿️',
    tag: 'Precision', accent: '#f59e0b',
    short: 'Five rounds of perpendicular parking — scored on alignment, speed and clean lines.',
    intro: 'Five rounds. Each round highlights a parking spot — drive in, line up straight, and come to a complete stop. The cleaner you park, the higher your score.',
    controls: baseControls, difficulties: DIFFS, createLesson: createParking,
  },
  {
    id: 'drive_roundabout', slug: 'roundabout', title: 'Roundabout Master', emoji: '🔄',
    tag: 'Navigation', accent: '#38bdf8',
    short: 'Read the call-out, pick your lane, signal, and leave at the right exit.',
    intro: 'The instructor calls a random exit each round. Approach the roundabout, signal correctly, and leave at the right exit. Wrong exit = retry.',
    controls: baseControls, difficulties: DIFFS, createLesson: createRoundabout,
  },
  {
    id: 'drive_lanechange', slug: 'lane-change', title: 'Lane Change Challenge', emoji: '⇆',
    tag: 'Awareness', accent: '#a855f7',
    short: 'Weave through highway traffic, signalling into each target lane for combo points.',
    intro: 'Heavy highway traffic. Signal first (Q / E), then move into the highlighted target lane and hold it. Chain clean changes for big combos — avoid collisions.',
    controls: baseControls, difficulties: DIFFS, createLesson: createLaneChange,
  },
  {
    id: 'drive_emergency', slug: 'emergency', title: 'Emergency Stop', emoji: '🛑',
    tag: 'Reaction', accent: '#ef4444',
    short: 'Build speed, then brake to a dead stop the instant a hazard appears.',
    intro: 'Get up to the target speed, then a hazard appears when you least expect it. Brake to a complete stop before hitting the cones. Reaction-time scored over 5 rounds.',
    controls: baseControls, difficulties: DIFFS, createLesson: createEmergency,
  },
  {
    id: 'drive_night', slug: 'night', title: 'Night Drive', emoji: '🌙',
    tag: 'Atmospheric', accent: '#6366f1',
    short: 'Follow glowing checkpoints through the dark with only your headlights.',
    intro: 'The world goes dark — your headlights are all you have. Follow the glowing checkpoints in order, from the parking lot up the highway to the roundabout.',
    controls: baseControls, difficulties: [{ id: 'easy', label: 'Clear' }, { id: 'medium', label: 'Misty' }, { id: 'hard', label: 'Pitch black' }],
    createLesson: createNight,
  },
  {
    id: 'drive_reverse', slug: 'reverse', title: 'Three-Point Turn', emoji: '↺',
    tag: 'Technical', accent: '#10b981',
    short: 'Turn the car around in a tight cone-marked space using forward and reverse.',
    intro: 'The road dead-ends. Use forward, reverse and steering to turn the car around inside the cone-marked area. Fewer movements and no cones knocked = top marks.',
    controls: baseControls, difficulties: DIFFS, createLesson: createReverse,
  },
];

export const LESSON_BY_SLUG = Object.fromEntries(LESSONS.map((l) => [l.slug, l]));
