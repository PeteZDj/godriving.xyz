/* ============================================================
 *  GoDriving.xyz — shared game engine (React module port)
 *  createEngine(container) returns an instance-scoped engine.
 *  Canvas rendering + car physics are ported verbatim from the
 *  original vanilla engine; HUD / notifications are surfaced via
 *  callbacks so React can render the chrome.
 * ============================================================ */

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const norm = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createEngine(container) {
  /* ========== World constants ========== */
  const LANE_WIDTH = 56;
  const LANES_PER_DIR = 4;
  const MEDIAN = 22;
  const HW_HALF = LANE_WIDTH * LANES_PER_DIR + MEDIAN / 2;
  const HW_WIDTH = HW_HALF * 2;

  const RA_LANES = 4;
  const RA_INNER = 110;
  const RA_RING = 60 * RA_LANES;
  const RA_OUTER = RA_INNER + RA_RING;

  const HW_NORTH_Y = -2000;
  const HW_SOUTH_Y = 200;
  const HW_CENTER_X = 0;
  const MERGE_ZONE = 200;

  const ROUNDABOUT = { x: 0, y: HW_NORTH_Y - RA_OUTER, outerR: RA_OUTER, innerR: RA_INNER };
  ROUNDABOUT.exits = [
    { id: 4, name: 'South', angle: 90, dir: 's' },
    { id: 1, name: 'East', angle: 0, dir: 'e' },
    { id: 2, name: 'North', angle: 270, dir: 'n' },
    { id: 3, name: 'West', angle: 180, dir: 'w' },
  ];

  const PARK = { x: -260, y: 1100, w: 520, h: 360, spots: [] };
  const SPOT_W = 70, SPOT_H = 110;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      PARK.spots.push({
        x: PARK.x + 30 + col * (SPOT_W + 8),
        y: PARK.y + 30 + row * (SPOT_H + 60),
        w: SPOT_W, h: SPOT_H,
        facing: row === 0 ? Math.PI / 2 : -Math.PI / 2,
        occupied: false,
      });
    }
  }
  const PARKED_COLORS = ['#dc2626', '#0ea5e9', '#16a34a', '#ca8a04', '#9333ea', '#f97316', '#475569', '#e11d48'];

  const PARK_ROAD = { x: 0, yTop: HW_SOUTH_Y, yBot: PARK.y - 20, laneWidth: LANE_WIDTH, lanes: 1 };

  const SIDE_ROADS = [
    { dir: 'e', x1: ROUNDABOUT.x + RA_OUTER, y1: ROUNDABOUT.y, x2: ROUNDABOUT.x + 1500, y2: ROUNDABOUT.y, lanes: 1 },
    { dir: 'n', x1: ROUNDABOUT.x, y1: ROUNDABOUT.y - RA_OUTER, x2: ROUNDABOUT.x, y2: ROUNDABOUT.y - 1500, lanes: 1 },
    { dir: 'w', x1: ROUNDABOUT.x - RA_OUTER, y1: ROUNDABOUT.y, x2: ROUNDABOUT.x - 1500, y2: ROUNDABOUT.y, lanes: 1 },
  ];

  /* ========== On-road helpers ========== */
  function onHighway(x, y, m = 0) {
    return Math.abs(x - HW_CENTER_X) < HW_HALF + m && y > HW_NORTH_Y - m && y < HW_SOUTH_Y + m;
  }
  function onParkRoad(x, y, m = 0) {
    return Math.abs(x - PARK_ROAD.x) < LANE_WIDTH + m && y > PARK_ROAD.yTop - m && y < PARK_ROAD.yBot + m;
  }
  function onParkLot(x, y, m = 0) {
    return x > PARK.x - m && x < PARK.x + PARK.w + m && y > PARK.y - m && y < PARK.y + PARK.h + m;
  }
  function onRoundabout(x, y, m = 0) {
    const d = dist(x, y, ROUNDABOUT.x, ROUNDABOUT.y);
    return d < ROUNDABOUT.outerR + m && d > ROUNDABOUT.innerR - m;
  }
  function onSideRoad(x, y, m = 0) {
    for (const r of SIDE_ROADS) {
      const minX = Math.min(r.x1, r.x2) - LANE_WIDTH - m;
      const maxX = Math.max(r.x1, r.x2) + LANE_WIDTH + m;
      const minY = Math.min(r.y1, r.y2) - LANE_WIDTH - m;
      const maxY = Math.max(r.y1, r.y2) + LANE_WIDTH + m;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) return true;
    }
    return false;
  }
  function onAnyRoad(x, y, m = 0) {
    return onHighway(x, y, m) || onParkRoad(x, y, m) || onParkLot(x, y, m) || onRoundabout(x, y, m) || onSideRoad(x, y, m);
  }

  /* ========== Decorations (deterministic) ========== */
  const TREES = [];
  const BUILDINGS = [];
  {
    const r = mulberry32(13);
    for (let i = 0; i < 320; i++) {
      const x = (r() - 0.5) * 5200;
      const y = (r() - 0.5) * 6500 - 800;
      if (onAnyRoad(x, y, 70)) continue;
      TREES.push({ x, y, r: 10 + r() * 10, shade: 0.85 + r() * 0.3 });
    }
    const palette = ['#475569', '#64748b', '#7c3aed44', '#0f766e44', '#b45309', '#9f1239', '#1d4ed8', '#334155'];
    for (let i = 0; i < 40; i++) {
      const w = 100 + r() * 180, h = 100 + r() * 180;
      const x = (r() - 0.5) * 4400 - w / 2;
      const y = (r() - 0.5) * 5500 - 800 - h / 2;
      let ok = true;
      for (let dx = 0; dx <= w && ok; dx += 40)
        for (let dy = 0; dy <= h && ok; dy += 40)
          if (onAnyRoad(x + dx, y + dy, 40)) ok = false;
      if (!ok) continue;
      BUILDINGS.push({ x, y, w, h, color: palette[Math.floor(r() * palette.length)] });
    }
  }

  /* ========== Player car ========== */
  const car = {
    x: 0, y: 0, heading: -Math.PI / 2,
    speed: 0, steering: 0,
    handbrake: false,
    signalLeft: false, signalRight: false,
    color: '#0ea5e9',
    width: 38, length: 70,
  };

  /* ========== Background traffic ========== */
  const TRAFFIC = [];
  function spawnTraffic(opts) {
    TRAFFIC.length = 0;
    const colors = ['#ef4444', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#94a3b8', '#fb7185'];
    const nbCount = opts && opts.nbCount != null ? opts.nbCount : 6;
    const sbCount = opts && opts.sbCount != null ? opts.sbCount : 6;
    const speedRange = (opts && opts.speedRange) || [70, 110];
    const spacing = (opts && opts.spacing) || 320;
    for (let i = 0; i < nbCount; i++) {
      const lane = i % LANES_PER_DIR;
      const xOff = MEDIAN / 2 + lane * LANE_WIDTH + LANE_WIDTH / 2;
      TRAFFIC.push({
        x: HW_CENTER_X + xOff, y: HW_SOUTH_Y - 200 - i * spacing,
        heading: -Math.PI / 2,
        speed: speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]),
        color: colors[Math.floor(Math.random() * colors.length)], dir: 'n',
      });
    }
    for (let i = 0; i < sbCount; i++) {
      const lane = i % LANES_PER_DIR;
      const xOff = MEDIAN / 2 + lane * LANE_WIDTH + LANE_WIDTH / 2;
      TRAFFIC.push({
        x: HW_CENTER_X - xOff, y: HW_NORTH_Y + 100 + i * spacing,
        heading: Math.PI / 2,
        speed: speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]),
        color: colors[Math.floor(Math.random() * colors.length)], dir: 's',
      });
    }
  }
  function updateTraffic(dt) {
    for (const t of TRAFFIC) {
      t.x += Math.cos(t.heading) * t.speed * dt;
      t.y += Math.sin(t.heading) * t.speed * dt;
      if (t.dir === 'n' && t.y < HW_NORTH_Y - 100) t.y = HW_SOUTH_Y + 100;
      if (t.dir === 's' && t.y > HW_SOUTH_Y + 100) t.y = HW_NORTH_Y - 100;
    }
  }

  /* ========== Audio ========== */
  const audio = {
    ctx: null, master: null, musicGain: null, sfxGain: null,
    engineGain: null, engineOsc: null, engineFilter: null,
    musicTimer: null, muted: false, initialised: false,
    init() {
      if (this.initialised) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.6;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.18;
        this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.55;
        this.sfxGain.connect(this.master);
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 60;
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 700;
        this.engineFilter.Q.value = 4;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.sfxGain);
        this.engineOsc.start();
        this.initialised = true;
        this.startMusic();
      } catch (e) { this.initialised = false; this.ctx = null; }
    },
    resume() { try { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch (_) {} },
    setMuted(m) {
      this.muted = m;
      try { if (this.master) this.master.gain.value = m ? 0 : 0.6; } catch (_) {}
      if (hudCb) hudCb({ muted: m });
    },
    toggleMute() { this.setMuted(!this.muted); },
    updateEngine(speed) {
      if (!this.initialised || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const a = Math.abs(speed);
        this.engineOsc.frequency.linearRampToValueAtTime(55 + a * 0.95, t + 0.06);
        this.engineGain.gain.linearRampToValueAtTime(a < 1 ? 0 : 0.04 + Math.min(0.22, a / 700), t + 0.06);
        this.engineFilter.frequency.linearRampToValueAtTime(400 + a * 4, t + 0.06);
      } catch (_) {}
    },
    tone(freq, dur, type = 'sine', vol = 0.3, attack = 0.005) {
      if (!this.initialised || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.sfxGain);
        o.start(t); o.stop(t + dur + 0.05);
      } catch (_) {}
    },
    signalClick() { this.tone(2200, 0.04, 'square', 0.12); },
    checkpoint() { this.tone(880, 0.18, 'sine', 0.32); setTimeout(() => this.tone(1320, 0.22, 'sine', 0.22), 70); },
    beep() { this.tone(1500, 0.08, 'square', 0.18); },
    buzz() { this.tone(180, 0.18, 'square', 0.18); },
    complete() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => this.tone(f, 0.18 + i * 0.05, 'triangle', 0.28), i * 110)); },
    fail() { this.tone(220, 0.28, 'sawtooth', 0.22); setTimeout(() => this.tone(165, 0.36, 'sawtooth', 0.22), 160); },
    crash() {
      this.tone(80, 0.5, 'sawtooth', 0.4);
      if (this.initialised && this.ctx) {
        try {
          const t = this.ctx.currentTime;
          const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.35, this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
          const src = this.ctx.createBufferSource(); src.buffer = buf;
          const g = this.ctx.createGain(); g.gain.value = 0.4;
          src.connect(g).connect(this.sfxGain);
          src.start(t);
        } catch (_) {}
      }
    },
    startMusic() {
      if (!this.initialised || !this.ctx || this.musicTimer) return;
      const chords = [
        { root: 130.81, intervals: [0, 4, 7, 12] },
        { root: 110.0, intervals: [0, 3, 7, 12] },
        { root: 87.31, intervals: [0, 4, 7, 12] },
        { root: 98.0, intervals: [0, 4, 7, 12] },
      ];
      const melody = [659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 659.25, 523.25];
      let chordIdx = 0, melIdx = 0;
      const playChord = () => {
        if (!this.initialised || !this.ctx) return;
        try {
          const t = this.ctx.currentTime;
          const c = chords[chordIdx];
          c.intervals.forEach((semis, i) => {
            const f = c.root * Math.pow(2, semis / 12);
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = i === 0 ? 'sine' : 'triangle';
            o.frequency.value = f;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.06, t + 0.6);
            g.gain.linearRampToValueAtTime(0.04, t + 3.0);
            g.gain.exponentialRampToValueAtTime(0.001, t + 4.0);
            o.connect(g).connect(this.musicGain);
            o.start(t); o.stop(t + 4.1);
          });
          const mf = melody[melIdx];
          const mo = this.ctx.createOscillator();
          const mg = this.ctx.createGain();
          mo.type = 'sine'; mo.frequency.value = mf;
          mg.gain.setValueAtTime(0, t + 0.5);
          mg.gain.linearRampToValueAtTime(0.05, t + 0.6);
          mg.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
          mo.connect(mg).connect(this.musicGain);
          mo.start(t + 0.5); mo.stop(t + 2.1);
          const ko = this.ctx.createOscillator();
          const kg = this.ctx.createGain();
          ko.type = 'sine';
          ko.frequency.setValueAtTime(110, t);
          ko.frequency.exponentialRampToValueAtTime(40, t + 0.18);
          kg.gain.setValueAtTime(0.18, t);
          kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
          ko.connect(kg).connect(this.musicGain);
          ko.start(t); ko.stop(t + 0.3);
          chordIdx = (chordIdx + 1) % chords.length;
          melIdx = (melIdx + 1) % melody.length;
        } catch (_) {}
      };
      playChord();
      this.musicTimer = setInterval(playChord, 4000);
    },
    stopAll() {
      try { if (this.musicTimer) clearInterval(this.musicTimer); } catch (_) {}
      this.musicTimer = null;
      try { if (this.ctx) this.ctx.close(); } catch (_) {}
      this.ctx = null; this.initialised = false;
    },
  };

  /* ========== Markers ========== */
  function makeMarker(x, y, opts = {}) {
    return { x, y, r: opts.r || 28, hit: false, kind: opts.kind || 'check', heading: opts.heading, color: opts.color || '#38bdf8', label: opts.label || null };
  }

  /* ========== Canvas / camera ========== */
  let canvas, ctx, mini = null, mctx = null;
  let W = 0, H = 0;
  const dpr = () => window.devicePixelRatio || 1;
  const camera = { x: 0, y: 0, zoom: 1.0, targetZoom: 1.0, lockedZoom: null };

  function resize() {
    W = container.clientWidth || window.innerWidth;
    H = container.clientHeight || window.innerHeight;
    const r = dpr();
    canvas.width = W * r;
    canvas.height = H * r;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  function worldToScreen(x, y) {
    return [(x - camera.x) * camera.zoom + W / 2, (y - camera.y) * camera.zoom + H / 2];
  }

  /* ========== Render helpers ========== */
  function strokeAt(x1, y1, x2, y2, color, width, dash) {
    const [a, b] = worldToScreen(x1, y1);
    const [c, d] = worldToScreen(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * camera.zoom;
    ctx.lineCap = 'butt';
    if (dash && dash.length) ctx.setLineDash(dash.map((v) => v * camera.zoom));
    else ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
    ctx.setLineDash([]);
  }
  function fillRectWorld(x, y, w, h, color) {
    const [sx, sy] = worldToScreen(x, y);
    ctx.fillStyle = color;
    ctx.fillRect(sx, sy, w * camera.zoom, h * camera.zoom);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawBackground() {
    ctx.fillStyle = '#3a7d3a';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#2f6a30';
    const tile = 220;
    const startX = Math.floor((camera.x - W / camera.zoom) / tile) * tile;
    const startY = Math.floor((camera.y - H / camera.zoom) / tile) * tile;
    for (let x = startX; x < camera.x + W / camera.zoom; x += tile) {
      for (let y = startY; y < camera.y + H / camera.zoom; y += tile) {
        const [sx, sy] = worldToScreen(x, y);
        if (((Math.floor(x / tile) + Math.floor(y / tile)) & 1) === 0) {
          ctx.fillRect(sx, sy, tile * camera.zoom + 2, tile * camera.zoom + 2);
        }
      }
    }
    ctx.restore();
  }

  function drawHighway() {
    fillRectWorld(HW_CENTER_X - HW_HALF, HW_NORTH_Y, HW_WIDTH, HW_SOUTH_Y - HW_NORTH_Y, '#2a2d34');
    strokeAt(HW_CENTER_X - HW_HALF + 3, HW_NORTH_Y, HW_CENTER_X - HW_HALF + 3, HW_SOUTH_Y, '#f8fafc', 4);
    strokeAt(HW_CENTER_X + HW_HALF - 3, HW_NORTH_Y, HW_CENTER_X + HW_HALF - 3, HW_SOUTH_Y, '#f8fafc', 4);
    const medianStart = HW_NORTH_Y;
    const medianEnd = HW_SOUTH_Y - MERGE_ZONE;
    fillRectWorld(HW_CENTER_X - MEDIAN / 2, medianStart, MEDIAN, medianEnd - medianStart, '#3a7d3a');
    strokeAt(HW_CENTER_X - MEDIAN / 2 - 1, medianStart, HW_CENTER_X - MEDIAN / 2 - 1, medianEnd, '#fbbf24', 3);
    strokeAt(HW_CENTER_X + MEDIAN / 2 + 1, medianStart, HW_CENTER_X + MEDIAN / 2 + 1, medianEnd, '#fbbf24', 3);
    for (let y = medianEnd; y < HW_SOUTH_Y; y += 22) {
      strokeAt(HW_CENTER_X - 10, y, HW_CENTER_X + 10, y + 22, 'rgba(251,191,36,0.6)', 2);
    }
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 1; i < LANES_PER_DIR; i++) {
        const x = HW_CENTER_X + side * (MEDIAN / 2 + i * LANE_WIDTH);
        strokeAt(x, HW_NORTH_Y, x, HW_SOUTH_Y, '#e2e8f0', 3, [28, 22]);
      }
    }
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < LANES_PER_DIR; i++) {
        const x = HW_CENTER_X + side * (MEDIAN / 2 + i * LANE_WIDTH + LANE_WIDTH / 2);
        const heading = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        for (let y = HW_NORTH_Y + 200; y < HW_SOUTH_Y - 250; y += 500) {
          drawArrow(x, y, heading, '#94a3b8aa');
        }
      }
    }
  }

  function drawArrow(x, y, heading, color) {
    const [sx, sy] = worldToScreen(x, y);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(heading + Math.PI / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -22); ctx.lineTo(10, 0); ctx.lineTo(4, 0); ctx.lineTo(4, 16);
    ctx.lineTo(-4, 16); ctx.lineTo(-4, 0); ctx.lineTo(-10, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawParkRoad() {
    const w = LANE_WIDTH * 2 + 8;
    fillRectWorld(PARK_ROAD.x - w / 2, PARK_ROAD.yTop, w, PARK_ROAD.yBot - PARK_ROAD.yTop, '#2a2d34');
    strokeAt(PARK_ROAD.x - w / 2 + 3, PARK_ROAD.yTop, PARK_ROAD.x - w / 2 + 3, PARK_ROAD.yBot, '#f8fafc', 3);
    strokeAt(PARK_ROAD.x + w / 2 - 3, PARK_ROAD.yTop, PARK_ROAD.x + w / 2 - 3, PARK_ROAD.yBot, '#f8fafc', 3);
    strokeAt(PARK_ROAD.x, PARK_ROAD.yTop, PARK_ROAD.x, PARK_ROAD.yBot, '#fbbf24', 3, [40, 22]);
  }

  function drawSideRoads() {
    for (const r of SIDE_ROADS) {
      const horizontal = r.y1 === r.y2;
      const w = LANE_WIDTH * 2 + 8;
      if (horizontal) {
        const minX = Math.min(r.x1, r.x2), maxX = Math.max(r.x1, r.x2);
        fillRectWorld(minX, r.y1 - w / 2, maxX - minX, w, '#2a2d34');
        strokeAt(minX, r.y1 - w / 2 + 3, maxX, r.y1 - w / 2 + 3, '#f8fafc', 3);
        strokeAt(minX, r.y1 + w / 2 - 3, maxX, r.y1 + w / 2 - 3, '#f8fafc', 3);
        strokeAt(minX, r.y1, maxX, r.y1, '#fbbf24', 3, [40, 22]);
      } else {
        const minY = Math.min(r.y1, r.y2), maxY = Math.max(r.y1, r.y2);
        fillRectWorld(r.x1 - w / 2, minY, w, maxY - minY, '#2a2d34');
        strokeAt(r.x1 - w / 2 + 3, minY, r.x1 - w / 2 + 3, maxY, '#f8fafc', 3);
        strokeAt(r.x1 + w / 2 - 3, minY, r.x1 + w / 2 + 3, maxY, '#f8fafc', 3);
        strokeAt(r.x1, minY, r.x1, maxY, '#fbbf24', 3, [40, 22]);
      }
    }
  }

  function drawRoundabout() {
    const [cx, cy] = worldToScreen(ROUNDABOUT.x, ROUNDABOUT.y);
    ctx.fillStyle = '#2a2d34';
    ctx.beginPath(); ctx.arc(cx, cy, ROUNDABOUT.outerR * camera.zoom, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a7d3a';
    ctx.beginPath(); ctx.arc(cx, cy, ROUNDABOUT.innerR * camera.zoom, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 6 * camera.zoom;
    ctx.setLineDash([12 * camera.zoom, 6 * camera.zoom]);
    ctx.beginPath(); ctx.arc(cx, cy, (ROUNDABOUT.innerR + 4) * camera.zoom, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const fx = cx + Math.cos(a) * ROUNDABOUT.innerR * 0.5 * camera.zoom;
      const fy = cy + Math.sin(a) * ROUNDABOUT.innerR * 0.5 * camera.zoom;
      ctx.fillStyle = i % 2 ? '#f43f5e' : '#fbbf24';
      ctx.beginPath(); ctx.arc(fx, fy, 8 * camera.zoom, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3 * camera.zoom;
    ctx.setLineDash([18 * camera.zoom, 14 * camera.zoom]);
    for (let i = 1; i < RA_LANES; i++) {
      const r = ROUNDABOUT.innerR + i * (ROUNDABOUT.outerR - ROUNDABOUT.innerR) / RA_LANES;
      ctx.beginPath(); ctx.arc(cx, cy, r * camera.zoom, 0, TAU); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4 * camera.zoom;
    ctx.beginPath(); ctx.arc(cx, cy, (ROUNDABOUT.outerR - 2) * camera.zoom, 0, TAU); ctx.stroke();
    for (const ex of ROUNDABOUT.exits) {
      const a = ex.angle * DEG;
      const sx = ROUNDABOUT.x + Math.cos(a) * (ROUNDABOUT.outerR + 70);
      const sy = ROUNDABOUT.y + Math.sin(a) * (ROUNDABOUT.outerR + 70);
      drawExitSign(sx, sy, 'EXIT ' + ex.id, ex.name);
    }
  }

  function drawExitSign(x, y, label, sub) {
    const [sx, sy] = worldToScreen(x, y);
    const w = 110 * camera.zoom, h = 54 * camera.zoom;
    ctx.save();
    ctx.fillStyle = '#1d4ed8';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3 * camera.zoom;
    roundRect(ctx, sx - w / 2, sy - h / 2, w, h, 8 * camera.zoom);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (16 * camera.zoom).toFixed(1) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, sx, sy - 7 * camera.zoom);
    ctx.font = (10 * camera.zoom).toFixed(1) + 'px sans-serif';
    ctx.fillText(sub, sx, sy + 11 * camera.zoom);
    ctx.restore();
  }

  function drawParkingLot() {
    fillRectWorld(PARK.x, PARK.y, PARK.w, PARK.h, '#2f3239');
    fillRectWorld(PARK_ROAD.x - LANE_WIDTH, PARK_ROAD.yBot - 30, LANE_WIDTH * 2, 60, '#2a2d34');
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4 * camera.zoom;
    const [px, py] = worldToScreen(PARK.x, PARK.y);
    ctx.strokeRect(px, py, PARK.w * camera.zoom, PARK.h * camera.zoom);
    for (const s of PARK.spots) {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3 * camera.zoom;
      const [sx, sy] = worldToScreen(s.x, s.y);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + s.h * camera.zoom);
      ctx.lineTo(sx + s.w * camera.zoom, sy + s.h * camera.zoom);
      ctx.lineTo(sx + s.w * camera.zoom, sy);
      ctx.stroke();
      if (s.highlight) {
        const phase = 0.25 + 0.2 * Math.sin(performance.now() / 250);
        ctx.fillStyle = `rgba(56, 189, 248, ${phase})`;
        ctx.fillRect(sx, sy, s.w * camera.zoom, s.h * camera.zoom);
      }
      if (s.occupied) drawCarRect(s.x + s.w / 2, s.y + s.h / 2, s.facing, s.color, 36, 64);
    }
  }

  function drawTrees() {
    for (const t of TREES) {
      const [sx, sy] = worldToScreen(t.x, t.y);
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(sx + 4 * camera.zoom, sy + 4 * camera.zoom, t.r * 1.05 * camera.zoom, t.r * 0.55 * camera.zoom, 0, 0, TAU);
      ctx.fill();
      const base = t.shade;
      ctx.fillStyle = '#1f5f1f';
      ctx.beginPath(); ctx.arc(sx, sy, t.r * camera.zoom, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2c8a2c';
      ctx.beginPath(); ctx.arc(sx - 4 * camera.zoom, sy - 4 * camera.zoom, t.r * 0.7 * camera.zoom * base, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3aa53a';
      ctx.beginPath(); ctx.arc(sx + 5 * camera.zoom, sy - 6 * camera.zoom, t.r * 0.45 * camera.zoom * base, 0, TAU); ctx.fill();
    }
  }

  function drawBuildings() {
    for (const b of BUILDINGS) {
      const [sx, sy] = worldToScreen(b.x, b.y);
      if (sx + b.w * camera.zoom < -50 || sx > W + 50 || sy + b.h * camera.zoom < -50 || sy > H + 50) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(sx + 8 * camera.zoom, sy + 8 * camera.zoom, b.w * camera.zoom, b.h * camera.zoom);
      ctx.fillStyle = b.color;
      ctx.fillRect(sx, sy, b.w * camera.zoom, b.h * camera.zoom);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(sx, sy, b.w * camera.zoom, 6 * camera.zoom);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
      const ww = 14 * camera.zoom, wh = 14 * camera.zoom;
      for (let yy = 12 * camera.zoom; yy < b.h * camera.zoom - 12 * camera.zoom; yy += 24 * camera.zoom) {
        for (let xx = 12 * camera.zoom; xx < b.w * camera.zoom - 12 * camera.zoom; xx += 24 * camera.zoom) {
          ctx.fillRect(sx + xx, sy + yy, ww, wh);
        }
      }
    }
  }

  function drawCarRect(wx, wy, heading, color, w, l) {
    const [sx, sy] = worldToScreen(wx, wy);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(heading);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, -l / 2 + 4, -w / 2 + 4, l, w, 6); ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, -l / 2, -w / 2, l, w, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-l / 2 + 4, -w / 2 + 3, l - 8, 4);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    roundRect(ctx, -l / 2 + 12, -w / 2 + 6, (l - 24) * 0.45, w - 12, 3); ctx.fill();
    roundRect(ctx, l / 2 - 22, -w / 2 + 6, 14, w - 12, 3); ctx.fill();
    ctx.restore();
  }

  function drawPlayerCar() {
    const [sx, sy] = worldToScreen(car.x, car.y);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(car.heading);
    ctx.scale(camera.zoom, camera.zoom);
    const w = car.width, l = car.length;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, -l / 2 + 5, -w / 2 + 5, l, w, 8); ctx.fill();
    const grad = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    grad.addColorStop(0, '#0ea5e9');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(1, '#075985');
    ctx.fillStyle = grad;
    roundRect(ctx, -l / 2, -w / 2, l, w, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-l / 2 + 5, -w / 2 + 3, l - 10, 4);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    roundRect(ctx, l / 2 - 24, -w / 2 + 5, 12, w - 10, 3); ctx.fill();
    roundRect(ctx, -l / 2 + 8, -w / 2 + 5, 10, w - 10, 3); ctx.fill();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    roundRect(ctx, -l / 2 + 18, -w / 2 + 4, l - 42, w - 8, 3); ctx.fill();
    ctx.fillStyle = '#0f172a';
    const wheelW = 5, wheelL = 10;
    ctx.fillRect(-l / 2 + 8, -w / 2 - wheelW / 2, wheelL, wheelW);
    ctx.fillRect(-l / 2 + 8, w / 2 - wheelW / 2, wheelL, wheelW);
    ctx.save();
    ctx.translate(l / 2 - 14, -w / 2);
    ctx.rotate(car.steering);
    ctx.fillRect(-wheelL / 2, -wheelW / 2, wheelL, wheelW);
    ctx.restore();
    ctx.save();
    ctx.translate(l / 2 - 14, w / 2);
    ctx.rotate(car.steering);
    ctx.fillRect(-wheelL / 2, -wheelW / 2, wheelL, wheelW);
    ctx.restore();
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(l / 2 - 4, -w / 2 + 3, 4, 6);
    ctx.fillRect(l / 2 - 4, w / 2 - 9, 4, 6);
    const glow = ctx.createRadialGradient(l / 2 + 4, 0, 2, l / 2 + 80, 0, 80);
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
    glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(l / 2, -w / 2); ctx.lineTo(l / 2 + 100, -w);
    ctx.lineTo(l / 2 + 100, w); ctx.lineTo(l / 2, w / 2);
    ctx.closePath(); ctx.fill();
    const braking = keys.KeyS || keys.ArrowDown || car.handbrake;
    ctx.fillStyle = braking ? '#fee2e2' : '#7f1d1d';
    ctx.shadowColor = braking ? '#ef4444' : 'transparent';
    ctx.shadowBlur = braking ? 12 : 0;
    ctx.fillRect(-l / 2, -w / 2 + 3, 4, 6);
    ctx.fillRect(-l / 2, w / 2 - 9, 4, 6);
    ctx.shadowBlur = 0;
    const blink = Math.floor(performance.now() / 250) % 2 === 0;
    if (car.signalLeft && blink) {
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12;
      ctx.fillRect(l / 2 - 4, -w / 2 - 1, 4, 4);
      ctx.fillRect(-l / 2, -w / 2 - 1, 4, 4);
      ctx.shadowBlur = 0;
    }
    if (car.signalRight && blink) {
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12;
      ctx.fillRect(l / 2 - 4, w / 2 - 3, 4, 4);
      ctx.fillRect(-l / 2, w / 2 - 3, 4, 4);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawMarker(m) {
    const [sx, sy] = worldToScreen(m.x, m.y);
    const t = performance.now() / 350;
    const pulse = 1 + Math.sin(t + m.x * 0.01) * 0.12;
    const z = camera.zoom;
    ctx.save();
    if (m.hit) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.arc(sx, sy, m.r * z, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 3 * z;
      ctx.beginPath(); ctx.arc(sx, sy, m.r * z, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4 * z;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(sx - 8 * z, sy);
      ctx.lineTo(sx - 2 * z, sy + 7 * z);
      ctx.lineTo(sx + 9 * z, sy - 8 * z);
      ctx.stroke();
    } else if (m.kind === 'arrow') {
      ctx.translate(sx, sy);
      ctx.rotate((m.heading || 0) + Math.PI / 2);
      ctx.scale(z, z);
      ctx.fillStyle = m.color + 'aa';
      ctx.beginPath();
      ctx.moveTo(0, -22); ctx.lineTo(14, 4); ctx.lineTo(6, 4);
      ctx.lineTo(6, 22); ctx.lineTo(-6, 22); ctx.lineTo(-6, 4); ctx.lineTo(-14, 4);
      ctx.closePath(); ctx.fill();
    } else {
      const r = m.r * pulse * z;
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 4 * z;
      ctx.shadowColor = m.color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = m.color;
      ctx.beginPath(); ctx.arc(sx, sy, m.r * z, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = m.color;
      if (m.kind === 'finish') {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + i * (TAU / 5);
          const x = sx + Math.cos(a) * 8 * z;
          const y = sy + Math.sin(a) * 8 * z;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          const a2 = a + TAU / 10;
          const x2 = sx + Math.cos(a2) * 4 * z;
          const y2 = sy + Math.sin(a2) * 4 * z;
          ctx.lineTo(x2, y2);
        }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(sx, sy, 6 * z, 0, TAU); ctx.fill();
      }
      if (m.label) {
        ctx.font = 'bold ' + (12 * z).toFixed(1) + 'px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = '#0f172a'; ctx.shadowBlur = 6;
        ctx.fillText(m.label, sx, sy - (m.r + 14) * z);
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
  }

  function drawNextMarkerIndicator(markers) {
    if (!markers) return;
    const next = markers.find((m) => !m.hit && m.kind !== 'arrow');
    if (!next) return;
    const [sx, sy] = worldToScreen(next.x, next.y);
    const margin = 80;
    if (sx >= margin && sx <= W - margin && sy >= margin && sy <= H - margin) return;
    const dx = sx - W / 2;
    const dy = sy - H / 2;
    const ang = Math.atan2(dy, dx);
    const r = Math.min(W, H) / 2 - 100;
    const ix = W / 2 + Math.cos(ang) * r;
    const iy = H / 2 + Math.sin(ang) * r;
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(ang);
    ctx.fillStyle = next.color;
    ctx.shadowColor = next.color; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-22, -12); ctx.lineTo(-14, 0); ctx.lineTo(-22, 12);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawCone(c) {
    const [sx, sy] = worldToScreen(c.x, c.y);
    const z = camera.zoom;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(sx + 3 * z, sy + 3 * z, 12 * z, 6 * z, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.ellipse(sx, sy + 4 * z, 12 * z, 4 * z, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c.hit ? '#475569' : '#f97316';
    ctx.beginPath();
    ctx.moveTo(sx - 9 * z, sy + 4 * z);
    ctx.lineTo(sx + 9 * z, sy + 4 * z);
    ctx.lineTo(sx, sy - 14 * z);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.hit ? '#94a3b8' : '#fde68a';
    ctx.beginPath();
    ctx.moveTo(sx - 7 * z, sy);
    ctx.lineTo(sx + 7 * z, sy);
    ctx.lineTo(sx + 5 * z, sy - 4 * z);
    ctx.lineTo(sx - 5 * z, sy - 4 * z);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ========== Minimap ========== */
  function drawMinimap(markers) {
    if (!mini || !mctx) return;
    const MW = mini.width, MH = mini.height;
    mctx.fillStyle = '#0f172a';
    mctx.fillRect(0, 0, MW, MH);
    const minX = -1700, maxX = 1700;
    const minY = -3300, maxY = 1700;
    const sc = Math.min(MW / (maxX - minX), MH / (maxY - minY));
    function w2m(x, y) { return [(x - minX) * sc, (y - minY) * sc]; }
    let [a, b] = w2m(HW_CENTER_X - HW_HALF, HW_NORTH_Y);
    let [c, d] = w2m(HW_CENTER_X + HW_HALF, HW_SOUTH_Y);
    mctx.fillStyle = '#475569';
    mctx.fillRect(a, b, c - a, d - b);
    [a, b] = w2m(PARK_ROAD.x - LANE_WIDTH, PARK_ROAD.yTop);
    [c, d] = w2m(PARK_ROAD.x + LANE_WIDTH, PARK_ROAD.yBot);
    mctx.fillRect(a, b, c - a, d - b);
    for (const r of SIDE_ROADS) {
      const horiz = r.y1 === r.y2;
      if (horiz) {
        const [x1, y1] = w2m(Math.min(r.x1, r.x2), r.y1 - LANE_WIDTH);
        const [x2, y2] = w2m(Math.max(r.x1, r.x2), r.y1 + LANE_WIDTH);
        mctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      } else {
        const [x1, y1] = w2m(r.x1 - LANE_WIDTH, Math.min(r.y1, r.y2));
        const [x2, y2] = w2m(r.x1 + LANE_WIDTH, Math.max(r.y1, r.y2));
        mctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      }
    }
    const [rcx, rcy] = w2m(ROUNDABOUT.x, ROUNDABOUT.y);
    mctx.fillStyle = '#475569';
    mctx.beginPath(); mctx.arc(rcx, rcy, ROUNDABOUT.outerR * sc, 0, TAU); mctx.fill();
    mctx.fillStyle = '#0f172a';
    mctx.beginPath(); mctx.arc(rcx, rcy, ROUNDABOUT.innerR * sc, 0, TAU); mctx.fill();
    [a, b] = w2m(PARK.x, PARK.y);
    [c, d] = w2m(PARK.x + PARK.w, PARK.y + PARK.h);
    mctx.fillStyle = '#334155';
    mctx.fillRect(a, b, c - a, d - b);
    if (markers) {
      for (const m of markers) {
        if (m.kind === 'arrow') continue;
        const [wx, wy] = w2m(m.x, m.y);
        if (m.hit) {
          mctx.fillStyle = '#22c55e';
          mctx.beginPath(); mctx.arc(wx, wy, 3, 0, TAU); mctx.fill();
        } else {
          mctx.fillStyle = m.color || '#38bdf8';
          mctx.beginPath(); mctx.arc(wx, wy, 4, 0, TAU); mctx.fill();
          mctx.strokeStyle = m.color || '#38bdf8';
          mctx.lineWidth = 1.5;
          mctx.beginPath();
          mctx.arc(wx, wy, 7 + Math.sin(performance.now() / 250 + m.x) * 1.5, 0, TAU);
          mctx.stroke();
        }
      }
    }
    const [pcx, pcy] = w2m(car.x, car.y);
    mctx.save();
    mctx.translate(pcx, pcy);
    mctx.rotate(car.heading + Math.PI / 2);
    mctx.fillStyle = '#0ea5e9';
    mctx.beginPath();
    mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6);
    mctx.closePath(); mctx.fill();
    mctx.restore();
    mctx.strokeStyle = 'rgba(255,255,255,0.1)';
    mctx.lineWidth = 1;
    mctx.strokeRect(0.5, 0.5, MW - 1, MH - 1);
  }

  /* ========== Input ========== */
  const keys = Object.create(null);
  let onKeyDown = null, onKeyUp = null;
  let resetCb = null;
  function setupInput(opts) {
    onKeyDown = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      keys[e.code] = true;
      if (e.code === 'KeyQ') {
        car.signalLeft = !car.signalLeft;
        if (car.signalLeft) car.signalRight = false;
        audio.signalClick();
      }
      if (e.code === 'KeyE') {
        car.signalRight = !car.signalRight;
        if (car.signalRight) car.signalLeft = false;
        audio.signalClick();
      }
      if (e.code === 'KeyR' && opts.onReset) opts.onReset();
      if (e.code === 'KeyM') audio.toggleMute();
    };
    onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
  }

  /* ========== Car physics ========== */
  const MAX_SPEED_FWD = 220;
  const MAX_SPEED_REV = -90;
  const ACCEL = 180, BRAKE = 380;
  const ENGINE_DRAG = 60, ROLL_DRAG = 0.985;
  const STEER_RATE = 3.2, STEER_RETURN = 5.0, MAX_STEER = 0.85;

  function updateCar(dt) {
    const acc = keys.KeyW || keys.ArrowUp ? 1 : 0;
    const brk = keys.KeyS || keys.ArrowDown ? 1 : 0;
    const left = keys.KeyA || keys.ArrowLeft ? 1 : 0;
    const right = keys.KeyD || keys.ArrowRight ? 1 : 0;
    car.handbrake = !!keys.Space;
    const steerTarget = (right - left) * MAX_STEER;
    const steerDelta = steerTarget - car.steering;
    if (left || right) car.steering += clamp(steerDelta, -STEER_RATE * dt, STEER_RATE * dt);
    else car.steering += clamp(-car.steering, -STEER_RETURN * dt, STEER_RETURN * dt);
    if (acc && !brk) {
      if (car.speed < 0) car.speed += BRAKE * dt;
      else car.speed += ACCEL * dt;
    } else if (brk && !acc) {
      if (car.speed > 0) car.speed -= BRAKE * dt;
      else car.speed -= ACCEL * 0.6 * dt;
    } else {
      const drag = ENGINE_DRAG * dt;
      if (car.speed > drag) car.speed -= drag;
      else if (car.speed < -drag) car.speed += drag;
      else car.speed = 0;
    }
    if (car.handbrake) {
      car.speed *= Math.pow(0.05, dt);
      if (Math.abs(car.speed) < 4) car.speed = 0;
    }
    car.speed *= Math.pow(ROLL_DRAG, dt * 60);
    car.speed = clamp(car.speed, MAX_SPEED_REV, MAX_SPEED_FWD);
    const wheelBase = 50;
    const turnRate = (car.speed / wheelBase) * Math.tan(car.steering);
    car.heading += turnRate * dt;
    car.heading = norm(car.heading);
    car.x += Math.cos(car.heading) * car.speed * dt;
    car.y += Math.sin(car.heading) * car.speed * dt;
  }

  function updateCamera(dt) {
    const lookAhead = clamp(car.speed * 0.6, -80, 140);
    const tx = car.x + Math.cos(car.heading) * lookAhead;
    const ty = car.y + Math.sin(car.heading) * lookAhead;
    const k = 1 - Math.pow(0.001, dt);
    camera.x = lerp(camera.x, tx, k);
    camera.y = lerp(camera.y, ty, k);
    camera.targetZoom = clamp(1.05 - Math.abs(car.speed) / 1400, 0.85, 1.05);
    if (camera.lockedZoom != null) camera.targetZoom = camera.lockedZoom;
    camera.zoom = lerp(camera.zoom, camera.targetZoom, k * 0.5);
  }

  /* ========== HUD callback ========== */
  let hudCb = null;
  function updateHud() {
    if (!hudCb) return;
    const speedKmh = Math.round(Math.abs(car.speed) * 0.36);
    let gear = 'N';
    if (car.speed > 5) gear = 'D';
    else if (car.speed < -5) gear = 'R';
    if (car.handbrake) gear = 'P';
    const blink = Math.floor(performance.now() / 250) % 2 === 0;
    hudCb({
      speed: speedKmh,
      gear,
      signalLeft: car.signalLeft && blink,
      signalRight: car.signalRight && blink,
    });
  }

  let _lastBlink = 0;
  function tickSignals() {
    const phase = Math.floor(performance.now() / 360) % 2;
    if (phase !== _lastBlink && (car.signalLeft || car.signalRight)) {
      audio.tone(phase ? 1700 : 900, 0.06, 'square', 0.1);
    }
    _lastBlink = phase;
  }

  /* ========== Notification callback ========== */
  let notifyCb = null;
  function notify(msg, type = 'success', dur = 1800) {
    if (notifyCb) notifyCb(msg, type, dur);
  }

  /* ========== Loop hooks ========== */
  let preRenderHook = null, postRenderHook = null, updateHook = null, drawObjectsHook = null;
  let started = false;
  let rafId = 0;
  let ro = null;

  const GoDriving = {
    TAU, DEG, LANE_WIDTH, LANES_PER_DIR, MEDIAN, HW_HALF, HW_WIDTH,
    HW_NORTH_Y, HW_SOUTH_Y, HW_CENTER_X, MERGE_ZONE,
    RA_LANES, RA_INNER, RA_OUTER, ROUNDABOUT,
    PARK, PARK_ROAD, SIDE_ROADS, SPOT_W, SPOT_H,
    TREES, BUILDINGS, TRAFFIC, PARKED_COLORS,
    car, audio, camera, keys,
    dist, clamp, lerp, norm, mulberry32, makeMarker, drawMarker, drawCone, drawCarRect, roundRect,
    worldToScreen, fillRectWorld, strokeAt, drawArrow, notify,
    onHighway, onParkRoad, onParkLot, onRoundabout, onSideRoad, onAnyRoad,
    spawnTraffic, updateTraffic,
    get width() { return W; },
    get height() { return H; },

    setMinimap(el) { mini = el; mctx = el ? el.getContext('2d') : null; },
    setHudCallback(fn) { hudCb = fn; },
    setNotifyCallback(fn) { notifyCb = fn; },

    init(opts = {}) {
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.display = 'block';
        canvas.style.touchAction = 'none';
        container.prepend(canvas);
        ctx = canvas.getContext('2d');
        resize();
        ro = new ResizeObserver(() => resize());
        ro.observe(container);
        setupInput({ onReset: () => resetCb && resetCb() });
      }

      if (opts.start) {
        car.x = opts.start.x;
        car.y = opts.start.y;
        car.heading = opts.start.heading != null ? opts.start.heading : -Math.PI / 2;
      }
      car.speed = 0; car.steering = 0;
      car.signalLeft = false; car.signalRight = false;
      camera.x = car.x; camera.y = car.y;
      camera.zoom = opts.zoom || 1.0;
      camera.lockedZoom = opts.zoom != null ? opts.zoom : null;

      PARK.spots.forEach((s) => { s.occupied = false; s.color = null; s.highlight = false; });
      if (opts.parkedSpots) {
        const r = mulberry32(7);
        for (const idx of opts.parkedSpots) {
          if (PARK.spots[idx]) {
            PARK.spots[idx].occupied = true;
            PARK.spots[idx].color = PARKED_COLORS[Math.floor(r() * PARKED_COLORS.length)];
          }
        }
      }

      if (opts.traffic === false) { TRAFFIC.length = 0; }
      else { spawnTraffic(opts.traffic || {}); }

      resetCb = opts.onReset || null;
    },

    setMission(m) {
      GoDriving._mission = m;
      if (m.markers) m.markers.forEach((mm) => (mm.hit = false));
      if (missionCb) missionCb({ title: m.title || '', desc: m.desc || '', step: m.step || '', progress: 0 });
    },

    setStart(x, y, heading) {
      car.x = x; car.y = y;
      if (heading != null) car.heading = heading;
      car.speed = 0; car.steering = 0;
      camera.x = x; camera.y = y;
    },
    resetCar() {
      if (this._initialStart) this.setStart(this._initialStart.x, this._initialStart.y, this._initialStart.heading);
    },
    rememberStart() { this._initialStart = { x: car.x, y: car.y, heading: car.heading }; },

    onUpdate(fn) { updateHook = fn; },
    onPreRender(fn) { preRenderHook = fn; },
    onPostRender(fn) { postRenderHook = fn; },
    onDrawObjects(fn) { drawObjectsHook = fn; },

    start() {
      if (started) return;
      started = true;
      audio.init();
      audio.resume();
      let last = performance.now();
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        updateCar(dt);
        updateTraffic(dt);
        updateCamera(dt);
        audio.updateEngine(car.speed);
        tickSignals();
        updateHud();
        if (updateHook) updateHook(dt);
        const mission = GoDriving._mission;
        if (mission && mission.markers) {
          let hits = 0, total = 0;
          for (const m of mission.markers) {
            if (m.kind === 'arrow') continue;
            total++;
            if (!m.hit && dist(car.x, car.y, m.x, m.y) < m.r) {
              m.hit = true;
              audio.checkpoint();
              if (mission.onMarker) mission.onMarker(m);
            }
            if (m.hit) hits++;
          }
          if (missionCb && total > 0) missionCb({ progress: (hits / total) * 100 });
          if (mission.check ? mission.check() : total > 0 && hits === total) {
            if (mission.onComplete) mission.onComplete();
            GoDriving._mission = null;
          }
        }
        ctx.clearRect(0, 0, W, H);
        drawBackground();
        drawHighway();
        drawParkRoad();
        drawSideRoads();
        drawParkingLot();
        drawRoundabout();
        drawBuildings();
        drawTrees();
        if (preRenderHook) preRenderHook(ctx);
        if (mission && mission.markers) for (const m of mission.markers) drawMarker(m);
        if (drawObjectsHook) drawObjectsHook(ctx);
        for (const t of TRAFFIC) drawCarRect(t.x, t.y, t.heading, t.color, 36, 64);
        drawPlayerCar();
        if (mission && mission.markers) drawNextMarkerIndicator(mission.markers);
        if (postRenderHook) postRenderHook(ctx);
        if (mctx) drawMinimap(mission ? mission.markers : null);
        rafId = requestAnimationFrame(frame);
      };
      rafId = requestAnimationFrame(frame);
    },

    setMissionCallback(fn) { missionCb = fn; },

    destroy() {
      started = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      if (onKeyDown) window.removeEventListener('keydown', onKeyDown);
      if (onKeyUp) window.removeEventListener('keyup', onKeyUp);
      if (ro) { try { ro.disconnect(); } catch (_) {} ro = null; }
      audio.stopAll();
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      GoDriving._mission = null;
    },
  };

  let missionCb = null;

  return GoDriving;
}
