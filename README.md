# GoDriving.xyz

**Learn to drive by playing.** GoDriving is a gamified driver-education platform that
teaches road signs and the highway code through games and puzzles, and connects new
drivers with trusted local driving schools — starting in Kenya and growing across
East Africa, Africa and beyond.

Live: https://godriving.xyz

## What's inside

- **Games & puzzles**
  - **Sign Library** – study every road sign with meanings (no login required)
  - **Sign Match** – memory match game pairing signs with their names
  - **Highway Code Quiz** – timed multiple-choice quiz with streaks & bonuses
  - **Road Run** – arcade lane-driving game (dodge traffic, collect coins)
- **Accounts & gamification** – email/password sign-up, XP, coins, levels, global rank
- **Driving-school directory** – searchable, filterable list of verified partner schools
- **Student → school leads** – learners request to enroll; schools receive the lead
- **Partner programme** – driving schools apply to join and share revenue
- **Leaderboards** – overall XP plus per-game rankings

## Tech stack

| Layer     | Technology                                             |
|-----------|--------------------------------------------------------|
| Frontend  | React 18 + TypeScript, Vite 6, React Router 7, Tailwind CSS v4, Motion, lucide-react |
| Backend   | Node.js + Express, PostgreSQL (`pg`), bcryptjs auth with session tokens |
| Hosting   | IIS (static SPA + reverse proxy) on Windows, Node API as an nssm service |

## Local development

```bash
npm install

# Terminal 1 — API (http://localhost:3009)
npm run server

# Terminal 2 — Vite dev server (http://localhost:5173, proxies /api)
npm run dev
```

Create a `.env` from `.env.example`:

```
PORT=3009
DATABASE_URL=postgresql://godriving:YOUR_PASSWORD@localhost:5432/godriving
SITE_URL=https://godriving.xyz
```

The API auto-creates all tables and seeds a starter set of driving schools on first run.

## Production build

```bash
npm run build      # outputs static site to ./build
```

Deploy the contents of `build/` (plus `web.config`) to the IIS site root and run
`server.js` as a background service. `web.config` reverse-proxies `/api/*` to the
Node API and serves the SPA for all other routes.

## API overview

| Method | Endpoint                | Description                        |
|--------|-------------------------|------------------------------------|
| POST   | `/api/auth/signup`      | Create account                     |
| POST   | `/api/auth/login`       | Log in                             |
| GET    | `/api/auth/me`          | Current user (Bearer token)        |
| GET    | `/api/me/stats`         | Progress, per-game stats, rank     |
| POST   | `/api/scores`           | Submit a game score (awards XP)    |
| GET    | `/api/leaderboard`      | Overall or `?game=` leaderboard    |
| GET    | `/api/schools`          | List/search driving schools        |
| POST   | `/api/schools`          | Apply as a partner school          |
| POST   | `/api/leads`            | Student enrollment request         |
| GET    | `/api/stats`            | Public landing-page counters       |

## Roadmap

- More games (parking simulator, hazard perception, traffic-light reaction)
- Localised content per country and Swahili language support
- In-app booking & payments with partner schools
- Mobile apps (PWA first)

---

Built with ❤️ for safer roads across Africa.


## Mobile App (React Native)

<img src="godriving-rn/assets/images/icon.png" alt="GoDriving app icon" width="72" align="left" />

**GoDriving for Android** is a native mobile app built with **React Native (Expo)** -- master the Highway Code with games, quizzes, a sign library, Sign Match and Road Run.

**[Download the Android app](https://godriving.xyz/downloads/godriving.apk)**

- **Source:** [`godriving-rn/`](godriving-rn) -- the full Expo Router + TypeScript project.
- **Stack:** Expo SDK 57, Expo Router, TypeScript, React Native, AsyncStorage.
- Runs on Android 7.0+ (arm64 / armv7). You may need to allow *install from unknown sources*.

<br clear="left" />
