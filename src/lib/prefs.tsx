import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Player preferences shared across the games (persisted to localStorage).
export type ControlsMode = 'auto' | 'on' | 'off';

export interface Prefs {
  /** When to show on-screen touch controls in the driving games. */
  controls: ControlsMode;
  /** Vibrate on button presses (where supported). */
  haptics: boolean;
  /** Game sound effects & engine audio. */
  sound: boolean;
  /** Bigger, easier-to-hit on-screen buttons. */
  bigControls: boolean;
}

const DEFAULT: Prefs = { controls: 'auto', haptics: true, sound: true, bigControls: false };
const KEY = 'godriving_prefs';

function load(): Prefs {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULT;
  }
}

interface Ctx {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}

const PrefsContext = createContext<Ctx>({ prefs: DEFAULT, setPref: () => {} });

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const setPref: Ctx['setPref'] = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));

  return <PrefsContext.Provider value={{ prefs, setPref }}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);

export const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/** Whether on-screen controls should currently be visible for the given mode. */
export function shouldShowControls(mode: ControlsMode) {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return isTouchDevice(); // 'auto'
}

/** Fire a short haptic pulse when enabled & supported. */
export function vibrate(enabled: boolean, pattern: number | number[] = 12) {
  if (enabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}
