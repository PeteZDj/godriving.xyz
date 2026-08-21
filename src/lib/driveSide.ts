// Driving-side detection: which side of the road a visitor's country drives on.
// Auto-detects from the browser locale/timezone with a manual override in Settings.
// Kenya (and the rest of East/Southern Africa, the UK, India, etc.) are LEFT-hand traffic.

export type DriveSide = 'left' | 'right';

// ISO 3166-1 alpha-2 codes for countries/territories that drive on the LEFT.
// Everything not in this set is treated as right-hand traffic.
export const LEFT_HAND_COUNTRIES = new Set<string>([
  'AI', 'AG', 'AU', 'BS', 'BD', 'BB', 'BM', 'BT', 'BW', 'BN', 'CK', 'CY', 'DM',
  'TL', 'FK', 'FJ', 'GD', 'GG', 'GY', 'HK', 'IN', 'ID', 'IE', 'IM', 'JM', 'JP',
  'JE', 'KE', 'KI', 'LS', 'MO', 'MW', 'MY', 'MV', 'MT', 'MU', 'MS', 'MZ', 'NA',
  'NR', 'NP', 'NZ', 'PK', 'PG', 'PN', 'SH', 'KN', 'LC', 'VC', 'WS', 'SC', 'SG',
  'SB', 'SS', 'ZA', 'LK', 'SR', 'SZ', 'TZ', 'TH', 'TO', 'TT', 'TC', 'TV', 'UG',
  'GB', 'VG', 'VI', 'ZM', 'ZW',
]);

/** Country picker options for Settings. `auto` = detect from the browser. */
export const COUNTRY_OPTIONS: { code: string; name: string; side?: DriveSide }[] = [
  { code: 'auto', name: 'Auto-detect (recommended)' },
  { code: 'KE', name: 'Kenya', side: 'left' },
  { code: 'TZ', name: 'Tanzania', side: 'left' },
  { code: 'UG', name: 'Uganda', side: 'left' },
  { code: 'ZA', name: 'South Africa', side: 'left' },
  { code: 'ZM', name: 'Zambia', side: 'left' },
  { code: 'ZW', name: 'Zimbabwe', side: 'left' },
  { code: 'GB', name: 'United Kingdom', side: 'left' },
  { code: 'IN', name: 'India', side: 'left' },
  { code: 'AU', name: 'Australia', side: 'left' },
  { code: 'NG', name: 'Nigeria', side: 'right' },
  { code: 'RW', name: 'Rwanda', side: 'right' },
  { code: 'GH', name: 'Ghana', side: 'right' },
  { code: 'US', name: 'United States', side: 'right' },
  { code: 'FR', name: 'France', side: 'right' },
  { code: 'DE', name: 'Germany', side: 'right' },
  { code: 'AE', name: 'UAE', side: 'right' },
];

// Minimal timezone -> country map used as a fallback when the locale has no region.
const TZ_COUNTRY: Record<string, string> = {
  'Africa/Nairobi': 'KE',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Kampala': 'UG',
  'Africa/Kigali': 'RW',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lusaka': 'ZM',
  'Africa/Harare': 'ZW',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Africa/Cairo': 'EG',
  'Africa/Addis_Ababa': 'ET',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Asia/Kolkata': 'IN',
  'Asia/Karachi': 'PK',
  'Asia/Colombo': 'LK',
  'Asia/Dubai': 'AE',
  'Asia/Tokyo': 'JP',
  'Asia/Singapore': 'SG',
  'Australia/Sydney': 'AU',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Los_Angeles': 'US',
};

/** Which side does this country drive on? Unknown/undefined => right. */
export function sideForCountry(code?: string | null): DriveSide {
  if (!code) return 'right';
  return LEFT_HAND_COUNTRIES.has(code.toUpperCase()) ? 'left' : 'right';
}

/** Best-effort country (ISO2) for the current visitor, with no permission prompt. */
export function detectCountry(): string {
  // 1) Region subtag from the browser locale, e.g. "en-KE" -> "KE".
  try {
    const langs = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
    for (const l of langs) {
      const m = /[-_]([A-Za-z]{2})(?:$|[-_])/.exec(l || '');
      if (m) return m[1].toUpperCase();
    }
  } catch { /* ignore */ }
  // 2) Fall back to the IANA timezone.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  } catch { /* ignore */ }
  // 3) Default to Kenya (the primary audience) — left-hand traffic.
  return 'KE';
}

/** Resolve the effective driving side from a saved preference ("auto" or ISO2). */
export function resolveDriveSide(pref?: string | null): DriveSide {
  if (pref && pref !== 'auto') return sideForCountry(pref);
  return sideForCountry(detectCountry());
}

/** Human label for a resolved side, e.g. "drive on the left". */
export function sideLabel(side: DriveSide): string {
  return side === 'left' ? 'drive on the LEFT' : 'drive on the RIGHT';
}
