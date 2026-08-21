// Map a country name (as stored on the user profile) to an emoji flag.
// Falls back to a globe when unknown so the header never shows a broken glyph.

const NAME_TO_ISO: Record<string, string> = {
  kenya: 'KE',
  uganda: 'UG',
  tanzania: 'TZ',
  rwanda: 'RW',
  burundi: 'BI',
  'south sudan': 'SS',
  ethiopia: 'ET',
  somalia: 'SO',
  nigeria: 'NG',
  ghana: 'GH',
  'south africa': 'ZA',
  'ivory coast': 'CI',
  "cote d'ivoire": 'CI',
  senegal: 'SN',
  cameroon: 'CM',
  zambia: 'ZM',
  zimbabwe: 'ZW',
  malawi: 'MW',
  mozambique: 'MZ',
  botswana: 'BW',
  namibia: 'NA',
  egypt: 'EG',
  morocco: 'MA',
  algeria: 'DZ',
  tunisia: 'TN',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  india: 'IN',
  canada: 'CA',
};

/** Turn a 2-letter ISO country code into a regional-indicator flag emoji. */
function isoToFlag(iso: string): string {
  const cc = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function flagFor(country?: string | null): string {
  if (!country) return '🌍';
  const raw = country.trim();
  if (/^[A-Za-z]{2}$/.test(raw)) return isoToFlag(raw) || '🌍';
  const iso = NAME_TO_ISO[raw.toLowerCase()];
  return iso ? isoToFlag(iso) : '🌍';
}
