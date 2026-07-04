import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- Minimal .env loader (no extra dependency) ----
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
} catch (e) {
  console.error('env load failed', e);
}

const PORT = process.env.PORT || 3009;
const GOOGLE_CLIENT_ID = '355354020888-nmt0qlr55adgprvhaht50oamstv637qs.apps.googleusercontent.com';
const gClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://godriving:GoDrive2025Pg!@localhost:5432/godriving',
  max: 10,
});

const q = (sql, params) => pool.query(sql, params);

// ---------------- DB init ----------------
async function initDb() {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      country TEXT,
      city TEXT,
      xp INTEGER NOT NULL DEFAULT 0,
      coins INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      avatar TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS driving_schools (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'Kenya',
      city TEXT NOT NULL,
      description TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      logo TEXT,
      rating REAL NOT NULL DEFAULT 4.5,
      price_from INTEGER,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      school_id INTEGER REFERENCES driving_schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS game_scores (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      accuracy REAL,
      meta JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      best_score INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, module)
    );

    CREATE TABLE IF NOT EXISTS newsletter (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Google OAuth migrations (idempotent)
  await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT`);
  await q(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
  await q(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_google_sub_key'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_google_sub_key UNIQUE (google_sub);
      END IF;
    END $$;
  `);

  const { rows } = await q('SELECT COUNT(*)::int AS c FROM driving_schools');
  if (rows[0].c === 0) {
    await seedSchools();
  }
}

async function seedSchools() {
  const schools = [
    ['AA Kenya Driving School', 'Kenya', 'Nairobi', 'The Automobile Association of Kenya — nationwide network with certified instructors and modern vehicles.', '+254 709 933 000', 'info@aakenya.co.ke', 15000, 4.8, true, true],
    ['Glory Driving School', 'Kenya', 'Nairobi', 'Affordable classes across Nairobi with flexible schedules and NTSA-approved curriculum.', '+254 722 000 111', 'hello@glorydriving.co.ke', 12000, 4.6, true, true],
    ['Petanns Driving School', 'Kenya', 'Nairobi', 'One of Kenya\u2019s largest driving schools with branches countrywide.', '+254 733 222 333', 'info@petanns.ac.ke', 13500, 4.5, true, false],
    ['Kenya Institute of Highway & Building Technology', 'Kenya', 'Nairobi', 'Professional driver training including heavy commercial vehicles.', '+254 720 444 555', 'admissions@kihbt.ac.ke', 18000, 4.4, true, false],
    ['Mombasa Coast Driving School', 'Kenya', 'Mombasa', 'Coastal region driver training with English and Swahili instruction.', '+254 711 666 777', 'coast@driving.co.ke', 11000, 4.3, true, false],
    ['Kampala Safe Drive', 'Uganda', 'Kampala', 'East Africa expansion partner — modern simulators and defensive driving courses.', '+256 700 123 456', 'info@kampalasafedrive.ug', 400000, 4.5, false, true],
    ['Dar Motion Driving Academy', 'Tanzania', 'Dar es Salaam', 'Swahili-first driver education with a focus on urban road safety.', '+255 754 000 000', 'karibu@darmotion.co.tz', 250000, 4.4, false, false],
    ['Kigali Road Masters', 'Rwanda', 'Kigali', 'Clean, disciplined driver training aligned with Rwanda road safety standards.', '+250 788 000 000', 'info@kigaliroadmasters.rw', 90000, 4.7, false, true],
  ];
  for (const s of schools) {
    await q(
      `INSERT INTO driving_schools (name, country, city, description, phone, email, price_from, rating, verified, featured, logo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [...s, `https://placehold.co/160x160/0071BC/ffffff?text=${encodeURIComponent(s[0].split(' ')[0])}`]
    );
  }
  console.log('Seeded driving schools');
}

// ---------------- Helpers ----------------
const LEVEL_STEP = 500; // xp per level
const levelForXp = (xp) => Math.max(1, Math.floor(xp / LEVEL_STEP) + 1);

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    country: u.country,
    city: u.city,
    xp: u.xp,
    coins: u.coins,
    level: u.level,
    avatar: u.avatar,
    createdAt: u.created_at,
  };
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  await q('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1,$2,$3)', [token, userId, expires]);
  return token;
}

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const { rows } = await q(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    if (!rows.length) return res.status(401).json({ error: 'Session expired' });
    req.user = rows[0];
    req.token = token;
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Auth error' });
  }
}

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: 'Server error' });
});

// ---------------- Routes ----------------
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'godriving-api', time: new Date().toISOString() }));

// POST /api/auth/google — verify Google ID token, upsert user, create session
app.post('/api/auth/google', wrap(async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'credential required' });

  const ticket = await gClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
  const { sub, email, name, picture } = ticket.getPayload();

  const { rows } = await q(
    `INSERT INTO users (email, name, avatar, google_sub, role, coins)
     VALUES ($1, $2, $3, $4, 'student', 50)
     ON CONFLICT (google_sub) DO UPDATE
       SET name = EXCLUDED.name, avatar = EXCLUDED.avatar
     RETURNING *`,
    [email, name, picture || null, sub]
  );
  const user = rows[0];
  const token = await createSession(user.id);
  res.json({ token, user: publicUser(user) });
}));

app.post('/api/auth/signup', wrap(async (req, res) => {
  let { name, email, password, country, city, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  email = String(email).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const exists = await q('SELECT 1 FROM users WHERE email=$1', [email]);
  if (exists.rows.length) return res.status(409).json({ error: 'An account with this email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const safeRole = role === 'school' ? 'school' : 'student';
  const { rows } = await q(
    `INSERT INTO users (name, email, password_hash, country, city, role, coins)
     VALUES ($1,$2,$3,$4,$5,$6,50) RETURNING *`,
    [name.trim(), email, hash, country || null, city || null, safeRole]
  );
  const user = rows[0];
  const token = await createSession(user.id);
  res.json({ token, user: publicUser(user) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  email = String(email).trim().toLowerCase();
  const { rows } = await q('SELECT * FROM users WHERE email=$1', [email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
  const token = await createSession(user.id);
  res.json({ token, user: publicUser(user) });
}));

app.get('/api/auth/me', auth, wrap(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));

app.post('/api/auth/logout', auth, wrap(async (req, res) => {
  await q('DELETE FROM sessions WHERE token=$1', [req.token]);
  res.json({ ok: true });
}));

// ---- Stats / profile ----
app.get('/api/me/stats', auth, wrap(async (req, res) => {
  const uid = req.user.id;
  const scores = await q(
    `SELECT game, MAX(score) AS best, COUNT(*)::int AS plays, ROUND(AVG(accuracy)::numeric,1) AS avg_accuracy
     FROM game_scores WHERE user_id=$1 GROUP BY game`,
    [uid]
  );
  const progress = await q('SELECT module, completed, best_score FROM progress WHERE user_id=$1', [uid]);
  const totalPlays = await q('SELECT COUNT(*)::int AS c FROM game_scores WHERE user_id=$1', [uid]);
  const rank = await q(
    `SELECT COUNT(*)+1 AS rank FROM users WHERE xp > (SELECT xp FROM users WHERE id=$1)`,
    [uid]
  );
  res.json({
    user: publicUser(req.user),
    games: scores.rows,
    progress: progress.rows,
    totalPlays: totalPlays.rows[0].c,
    globalRank: Number(rank.rows[0].rank),
  });
}));

// ---- Submit a game score (awards xp + coins) ----
app.post('/api/scores', auth, wrap(async (req, res) => {
  const uid = req.user.id;
  let { game, score, accuracy, meta } = req.body || {};
  if (!game) return res.status(400).json({ error: 'game is required' });
  score = Math.max(0, Math.min(1000000, parseInt(score, 10) || 0));
  const acc = accuracy == null ? null : Math.max(0, Math.min(100, Number(accuracy)));

  await q(
    'INSERT INTO game_scores (user_id, game, score, accuracy, meta) VALUES ($1,$2,$3,$4,$5)',
    [uid, game, score, acc, meta ? JSON.stringify(meta) : null]
  );

  const xpGain = Math.round(score / 10) + 10;
  const coinGain = Math.round(score / 25);
  const upd = await q(
    'UPDATE users SET xp = xp + $2, coins = coins + $3 WHERE id=$1 RETURNING *',
    [uid, xpGain, coinGain]
  );
  let user = upd.rows[0];
  const newLevel = levelForXp(user.xp);
  if (newLevel !== user.level) {
    const lv = await q('UPDATE users SET level=$2 WHERE id=$1 RETURNING *', [uid, newLevel]);
    user = lv.rows[0];
  }

  await q(
    `INSERT INTO progress (user_id, module, completed, best_score)
     VALUES ($1,$2,TRUE,$3)
     ON CONFLICT (user_id, module) DO UPDATE
     SET best_score = GREATEST(progress.best_score, EXCLUDED.best_score),
         completed = TRUE, updated_at = NOW()`,
    [uid, game, score]
  );

  res.json({ xpGain, coinGain, user: publicUser(user) });
}));

// ---- Leaderboard ----
app.get('/api/leaderboard', wrap(async (req, res) => {
  const game = req.query.game;
  let rows;
  if (game) {
    ({ rows } = await q(
      `SELECT u.name, u.city, u.country, MAX(gs.score) AS score
       FROM game_scores gs JOIN users u ON u.id = gs.user_id
       WHERE gs.game=$1 GROUP BY u.id, u.name, u.city, u.country
       ORDER BY score DESC LIMIT 20`,
      [game]
    ));
  } else {
    ({ rows } = await q(
      `SELECT name, city, country, xp AS score, level FROM users ORDER BY xp DESC LIMIT 20`
    ));
  }
  res.json({ leaderboard: rows });
}));

// ---- Driving schools ----
app.get('/api/schools', wrap(async (req, res) => {
  const { country, q: search } = req.query;
  const clauses = [];
  const params = [];
  if (country) { params.push(country); clauses.push(`country = $${params.length}`); }
  if (search) { params.push(`%${search}%`); clauses.push(`(name ILIKE $${params.length} OR city ILIKE $${params.length})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await q(
    `SELECT * FROM driving_schools ${where} ORDER BY featured DESC, rating DESC, name ASC`,
    params
  );
  res.json({ schools: rows });
}));

app.get('/api/schools/:id', wrap(async (req, res) => {
  const { rows } = await q('SELECT * FROM driving_schools WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ school: rows[0] });
}));

// Register a school partner (public application)
app.post('/api/schools', wrap(async (req, res) => {
  const { name, country, city, description, phone, email, website, price_from } = req.body || {};
  if (!name || !city) return res.status(400).json({ error: 'School name and city are required' });
  const { rows } = await q(
    `INSERT INTO driving_schools (name, country, city, description, phone, email, website, price_from, verified, logo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,FALSE,$9) RETURNING *`,
    [name, country || 'Kenya', city, description || null, phone || null, email || null, website || null,
     price_from || null, `https://placehold.co/160x160/4CAF50/ffffff?text=${encodeURIComponent(String(name).split(' ')[0])}`]
  );
  res.json({ school: rows[0], message: 'Application received. Our team will verify your school shortly.' });
}));

// Student lead -> connect with a school
app.post('/api/leads', wrap(async (req, res) => {
  const { school_id, name, email, phone, message, user_id } = req.body || {};
  if (!school_id || !name || !email) return res.status(400).json({ error: 'school, name and email are required' });
  const { rows } = await q(
    `INSERT INTO leads (school_id, user_id, name, email, phone, message)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [school_id, user_id || null, name, email, phone || null, message || null]
  );
  res.json({ ok: true, id: rows[0].id, message: 'Request sent! The school will reach out to you soon.' });
}));

// Newsletter
app.post('/api/newsletter', wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  await q('INSERT INTO newsletter (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
  res.json({ ok: true });
}));

// Public stats for landing page
app.get('/api/stats', wrap(async (req, res) => {
  const users = await q('SELECT COUNT(*)::int AS c FROM users');
  const schools = await q('SELECT COUNT(*)::int AS c FROM driving_schools');
  const plays = await q('SELECT COUNT(*)::int AS c FROM game_scores');
  res.json({
    learners: users.rows[0].c,
    schools: schools.rows[0].c,
    gamesPlayed: plays.rows[0].c,
  });
}));

async function start() {
  try {
    await initDb();
    console.log('Database ready');
  } catch (e) {
    console.error('DB init failed:', e.message);
  }
  app.listen(PORT, () => console.log(`GoDriving API listening on http://localhost:${PORT}`));
}

start();
