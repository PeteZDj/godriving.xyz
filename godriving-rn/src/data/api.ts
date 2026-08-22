// GoDriving API client. Reads from the live backend at godriving.xyz, with a
// graceful fallback to bundled data so the app is never blank. Writes
// (leads/partner) are best-effort.

import { FALLBACK_SCHOOLS } from './schools';
import type { LeaderboardEntry, PublicStats, School } from './types';

export const API_BASE = 'https://godriving.xyz/api';

async function get<T>(path: string, timeoutMs = 7000): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function post<T>(path: string, body: any, timeoutMs = 7000): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchStats(): Promise<PublicStats> {
  const live = await get<PublicStats>('/stats');
  return live ?? { learners: 1200, schools: FALLBACK_SCHOOLS.length, gamesPlayed: 8400 };
}

export async function fetchSchools(q?: string, country?: string): Promise<School[]> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (country) params.set('country', country);
  const qs = params.toString();
  const live = await get<{ schools: School[] }>(`/schools${qs ? `?${qs}` : ''}`);
  let list = live?.schools ?? FALLBACK_SCHOOLS;
  if (!live) {
    if (country) list = list.filter((s) => s.country === country);
    if (q) {
      const t = q.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(t) || s.city.toLowerCase().includes(t));
    }
  }
  return list;
}

export async function fetchLeaderboard(game?: string): Promise<LeaderboardEntry[]> {
  const live = await get<{ leaderboard: LeaderboardEntry[] }>(`/leaderboard${game ? `?game=${game}` : ''}`);
  if (live?.leaderboard) return live.leaderboard;
  // Fallback demo leaderboard
  const names = ['Pete Njagi', 'Amina Yusuf', 'Brian Otieno', 'Grace Wambui', 'Samuel Kiptoo', 'Lucy Achieng', 'David Mwangi', 'Faith Njoki'];
  return names.map((name, i) => ({ name, city: 'Nairobi', country: 'Kenya', score: 2400 - i * 260, level: 5 - Math.floor(i / 2) }));
}

export async function submitLead(body: { school_id: number; name: string; email: string; phone?: string; message?: string }): Promise<boolean> {
  const r = await post('/leads', body);
  return !!r;
}

export async function submitPartner(school: any): Promise<boolean> {
  const r = await post('/schools', school);
  return !!r;
}
