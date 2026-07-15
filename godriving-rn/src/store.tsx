// GoDriving client state — a demo account with XP / coins / level and per-game
// best scores, persisted with AsyncStorage. Uses the same scoring formulas as
// the web backend so progression matches the site.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { levelFromXp } from '@/theme';

const KEY = 'godriving_state_v1';
const SIGNUP_COINS = 50;

export interface GDUser {
  name: string;
  email: string;
  city?: string;
  country?: string;
  provider: 'email' | 'google' | 'demo';
}

export interface GameStat {
  best: number;
  plays: number;
  lastAccuracy?: number;
}

interface Persisted {
  user: GDUser | null;
  xp: number;
  coins: number;
  games: Record<string, GameStat>;
}

const initial: Persisted = {
  user: null,
  xp: 0,
  coins: 0,
  games: {},
};

export interface ScoreResult {
  xpGain: number;
  coinGain: number;
  isBest: boolean;
}

interface Ctx {
  ready: boolean;
  user: GDUser | null;
  xp: number;
  coins: number;
  level: number;
  games: Record<string, GameStat>;
  signIn: (name: string, email: string, opts?: { city?: string; country?: string; provider?: GDUser['provider'] }) => void;
  signOut: () => void;
  submitScore: (game: string, score: number, accuracy?: number | null) => ScoreResult;
  bestFor: (game: string) => number;
}

const AppCtx = createContext<Ctx | null>(null);

export function GoDrivingProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Persisted>(initial);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setS({ ...initial, ...JSON.parse(raw) });
      } catch {}
      hydrated.current = true;
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  }, [s]);

  const submitScore = useCallback((game: string, score: number, accuracy?: number | null): ScoreResult => {
    const clamped = Math.max(0, Math.min(1_000_000, Math.round(score)));
    const xpGain = Math.round(clamped / 10) + 10;
    const coinGain = Math.round(clamped / 25);
    let isBest = false;
    setS((p) => {
      const prev = p.games[game] ?? { best: 0, plays: 0 };
      isBest = clamped > prev.best;
      return {
        ...p,
        xp: p.xp + xpGain,
        coins: p.coins + coinGain,
        games: {
          ...p.games,
          [game]: { best: Math.max(prev.best, clamped), plays: prev.plays + 1, lastAccuracy: accuracy ?? prev.lastAccuracy },
        },
      };
    });
    return { xpGain, coinGain, isBest };
  }, []);

  const api: Ctx = useMemo(
    () => ({
      ready,
      user: s.user,
      xp: s.xp,
      coins: s.coins,
      level: levelFromXp(s.xp),
      games: s.games,
      signIn: (name, email, opts) =>
        setS((p) => ({
          ...p,
          user: { name, email, city: opts?.city, country: opts?.country, provider: opts?.provider ?? 'email' },
          coins: p.user ? p.coins : p.coins + SIGNUP_COINS,
        })),
      signOut: () => setS((p) => ({ ...p, user: null })),
      submitScore,
      bestFor: (game) => s.games[game]?.best ?? 0,
    }),
    [ready, s, submitScore],
  );

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>;
}

export function useGD(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useGD must be used within GoDrivingProvider');
  return ctx;
}
