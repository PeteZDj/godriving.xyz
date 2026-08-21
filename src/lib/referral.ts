/**
 * Referral attribution.
 *
 * Deliberately written with no imports and no framework coupling, because the
 * same file is meant to drop into goflying.xyz unchanged. The only thing that
 * differs between the two sites is SITE.
 *
 * How it works today
 * ------------------
 * A visitor arrives on `?ref=CODE`. We stash the code with a timestamp and the
 * landing page, then attach it to every enquiry the visitor sends. Attribution
 * is last-click within a 90-day window, which is the ordinary default and the
 * one affiliates expect.
 *
 * What it does NOT do
 * -------------------
 * There is no server, so nothing is counted centrally, nothing is verified, and
 * nobody gets paid automatically. A referral is only proven when it reaches us
 * inside an enquiry. That is an honest limitation of a static site and it is
 * stated on the affiliate page rather than papered over.
 */

export const SITE = 'godriving.xyz';

const KEY = 'godriving.ref.v1';
const WINDOW_DAYS = 90;

export type Referral = {
  code: string;
  /** ISO timestamp of first capture. */
  at: string;
  /** Where they landed, so an affiliate can see which link worked. */
  landing: string;
};

function isFresh(r: Referral): boolean {
  const age = Date.now() - new Date(r.at).getTime();
  return age < WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** Codes are uppercase alphanumeric; anything else is somebody probing the query string. */
export function normaliseCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return code.length >= 3 && code.length <= 24 ? code : null;
}

/**
 * Read `?ref=` from the current URL and store it. Call once on mount.
 * Returns the active referral, whether it was just captured or already held.
 */
export function captureReferral(): Referral | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get('ref') ?? params.get('via');
    if (incoming) {
      const code = normaliseCode(incoming);
      if (code) {
        // Last click wins: a fresh click overwrites an older stored code.
        const ref: Referral = {
          code,
          at: new Date().toISOString(),
          landing: window.location.pathname,
        };
        localStorage.setItem(KEY, JSON.stringify(ref));
        return ref;
      }
    }
    return activeReferral();
  } catch {
    return null;
  }
}

export function activeReferral(): Referral | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const ref = JSON.parse(raw) as Referral;
    if (!ref?.code || !isFresh(ref)) {
      localStorage.removeItem(KEY);
      return null;
    }
    return ref;
  } catch {
    return null;
  }
}

export function clearReferral(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** A line appended to every outgoing enquiry so the referral survives the handoff. */
export function referralFooter(): string {
  const ref = activeReferral();
  if (!ref) return '';
  return [
    '',
    '---',
    `Referred by: ${ref.code}`,
    `Referral captured: ${new Date(ref.at).toISOString().slice(0, 10)} via ${SITE}${ref.landing}`,
  ].join('\n');
}

/** Build the link an affiliate shares. */
export function affiliateLink(code: string, path = '/'): string {
  const clean = normaliseCode(code);
  if (!clean) return `https://${SITE}${path}`;
  return `https://${SITE}${path}?ref=${clean}`;
}

/** Suggest a code from a name — affiliates rarely pick a good one unprompted. */
export function suggestCode(name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  return base.length >= 3 ? base : '';
}

/** The commission table, shared by both sites. Kept here so it is stated once. */
export const TIERS = [
  {
    name: 'Starter',
    range: '1–9 enrolments',
    rate: '5%',
    note: 'Everyone starts here. Paid on the school’s first invoice, not on the full course.',
  },
  {
    name: 'Established',
    range: '10–29 enrolments',
    rate: '7.5%',
    note: 'Unlocked automatically once ten referred students have enrolled and paid.',
  },
  {
    name: 'Partner',
    range: '30+ enrolments',
    rate: '10%',
    note: 'Plus a co-branded landing page and early access to new drills.',
  },
];
