// GoDriving design system — ported from the web app (gamified driver-ed).
// Brand blue #0071BC + "go" green #4CAF50 on a light theme.
// Fonts: Poppins (display/headings) + Open Sans (body), matching the web.
//
// Token semantics (so shared ui.tsx / charts.tsx render on light surfaces):
//   ink / text  → PRIMARY foreground (near-black ink)
//   bg          → screen background (very light blue tint)
//   card        → elevated surface (white)
//   line/line2  → subtle borders

export const C = {
  brand: '#0071BC', // primary blue
  brandLight: '#2A93D5',
  brandDark: '#005A96',
  brandDeep: '#0B1B2B', // footer navy / dark sections
  brandMuted: '#E0F2FE', // light blue tint for badges/chips

  accent: '#4CAF50', // "go" green
  accentEnd: '#3D9140',
  go: '#4CAF50',
  goDark: '#3D9140',
  gold: '#E6A700', // XP / coins / warning amber
  goldLight: '#FFCF33',

  // foreground (dark ink on light)
  ink: '#1A1A1A',
  ink2: '#2B2B2B',
  heroDark: '#0B1B2B',
  navy: '#0B1B2B',
  navy2: '#12293D',

  bg: '#F3F7FB', // light blue-gray page tint
  bgElevated: '#EAF2FA',
  tint: '#EAF2FA',
  card: '#FFFFFF',
  card2: '#F3F7FB',
  line: '#E5EAF0',
  line2: '#EEF3F8',

  text: '#1A1A1A',
  textSub: '#4A5568',
  muted: '#6B7280',
  subInk: '#374151',

  white: '#FFFFFF',
  black: '#000000',

  // Semantic / status
  live: '#4CAF50',
  liveGlow: '#66BB6A',
  correct: '#4CAF50',
  wrong: '#D21E2B',
  red: '#D21E2B',
  yellow: '#E6A700',
  green: '#4CAF50',
  orange: '#F59E0B',
  blue: '#0071BC',

  // sign categories (from web)
  catRegulatory: '#D21E2B',
  catWarning: '#E6A700',
  catMandatory: '#0D5FBE',
  catInformation: '#4CAF50',

  // charts
  chart1: '#0071BC',
  chart2: '#4CAF50',
  chart3: '#E6A700',
  chart4: '#2A93D5',
  chart5: '#D21E2B',
} as const;

export const GRAD = {
  brand: ['#0071BC', '#005A96'] as [string, string],
  brandGlow: ['#2A93D5', '#0071BC'] as [string, string],
  hero: ['#005A96', '#0071BC', '#2A93D5'] as [string, string, string],
  deep: ['#0B1B2B', '#005A96'] as [string, string],
  go: ['#4CAF50', '#3D9140'] as [string, string],
  gold: ['#E6A700', '#FFCF33'] as [string, string],
};

export function parseGradient(color: string, fallback: [string, string] = GRAD.brand): [string, string] {
  const matches = color.match(/#([0-9a-fA-F]{6})/g);
  if (matches && matches.length >= 2) return [matches[0], matches[1]];
  if (matches && matches.length === 1) return [matches[0], matches[0]];
  return fallback;
}

export const font = {
  // display / headings — Poppins
  black: 'Poppins_800ExtraBold',
  extra: 'Poppins_800ExtraBold',
  bold: 'Poppins_700Bold',
  semi: 'Poppins_600SemiBold',
  head: 'Poppins_500Medium',
  // body — Open Sans
  body: 'OpenSans_400Regular',
  bodySemi: 'OpenSans_600SemiBold',
  bodyBold: 'OpenSans_700Bold',
  // numbers / stats
  mono: 'OpenSans_600SemiBold',
  monoBold: 'OpenSans_700Bold',
} as const;

export const radius = { sm: 10, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#0B1B2B',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  soft: {
    shadowColor: '#0B1B2B',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  brand: {
    shadowColor: '#0071BC',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
} as const;

// Level from XP (mirrors server): 500 XP per level
export const XP_PER_LEVEL = 500;
export const levelFromXp = (xp: number) => Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
export const xpIntoLevel = (xp: number) => xp % XP_PER_LEVEL;
