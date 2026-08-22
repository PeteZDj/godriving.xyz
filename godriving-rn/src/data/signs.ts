export type SignCategory = 'Regulatory' | 'Warning' | 'Mandatory' | 'Information';

export interface RoadSign {
  id: string;
  name: string;
  category: SignCategory;
  description: string;
  svg: string;
}

// Reusable SVG building blocks (200x200 viewBox)
const warnTriangle = (inner: string) =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <polygon points="100,14 190,182 10,182" fill="#ffce00" stroke="#111" stroke-width="10" stroke-linejoin="round"/>
    ${inner}
  </svg>`;

const redCircle = (inner: string) =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="86" fill="#fff" stroke="#d21e2b" stroke-width="16"/>
    ${inner}
  </svg>`;

const blueCircle = (inner: string) =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="92" fill="#0d5fbe"/>
    ${inner}
  </svg>`;

const blueRect = (inner: string) =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect x="14" y="30" width="172" height="140" rx="10" fill="#0d5fbe" stroke="#fff" stroke-width="6"/>
    ${inner}
  </svg>`;

export const SIGNS: RoadSign[] = [
  {
    id: 'stop',
    name: 'Stop',
    category: 'Regulatory',
    description: 'Come to a complete stop. Give way to all traffic and pedestrians before proceeding.',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <polygon points="60,12 140,12 188,60 188,140 140,188 60,188 12,140 12,60" fill="#d21e2b" stroke="#fff" stroke-width="8"/>
      <text x="100" y="118" font-family="Arial" font-weight="bold" font-size="52" fill="#fff" text-anchor="middle">STOP</text>
    </svg>`,
  },
  {
    id: 'yield',
    name: 'Give Way (Yield)',
    category: 'Regulatory',
    description: 'Slow down and give way to traffic on the road you are entering.',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <polygon points="100,186 12,26 188,26" fill="#fff" stroke="#d21e2b" stroke-width="16" stroke-linejoin="round"/>
      <text x="100" y="90" font-family="Arial" font-weight="bold" font-size="30" fill="#111" text-anchor="middle">GIVE</text>
      <text x="100" y="125" font-family="Arial" font-weight="bold" font-size="30" fill="#111" text-anchor="middle">WAY</text>
    </svg>`,
  },
  {
    id: 'no-entry',
    name: 'No Entry',
    category: 'Regulatory',
    description: 'Vehicles are prohibited from entering. Do not proceed beyond this point.',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="100" cy="100" r="90" fill="#d21e2b"/>
      <rect x="42" y="86" width="116" height="28" rx="4" fill="#fff"/>
    </svg>`,
  },
  {
    id: 'speed-50',
    name: 'Speed Limit 50',
    category: 'Regulatory',
    description: 'Maximum speed of 50 km/h. Do not exceed this limit.',
    svg: redCircle(`<text x="100" y="128" font-family="Arial" font-weight="bold" font-size="82" fill="#111" text-anchor="middle">50</text>`),
  },
  {
    id: 'speed-80',
    name: 'Speed Limit 80',
    category: 'Regulatory',
    description: 'Maximum speed of 80 km/h. Common on highways and open roads.',
    svg: redCircle(`<text x="100" y="128" font-family="Arial" font-weight="bold" font-size="82" fill="#111" text-anchor="middle">80</text>`),
  },
  {
    id: 'no-overtaking',
    name: 'No Overtaking',
    category: 'Regulatory',
    description: 'Overtaking other vehicles is prohibited on this stretch of road.',
    svg: redCircle(`
      <rect x="66" y="58" width="26" height="84" rx="5" fill="#111"/>
      <rect x="108" y="58" width="26" height="84" rx="5" fill="#d21e2b"/>`),
  },
  {
    id: 'no-parking',
    name: 'No Parking',
    category: 'Regulatory',
    description: 'Parking is not allowed here at any time.',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="100" cy="100" r="86" fill="#0d5fbe" stroke="#d21e2b" stroke-width="16"/>
      <text x="100" y="132" font-family="Arial" font-weight="bold" font-size="90" fill="#fff" text-anchor="middle">P</text>
      <line x1="40" y1="40" x2="160" y2="160" stroke="#d21e2b" stroke-width="16"/>
    </svg>`,
  },
  {
    id: 'roundabout',
    name: 'Roundabout',
    category: 'Regulatory',
    description: 'A roundabout ahead. Give way to traffic already on the roundabout.',
    svg: blueCircle(`
      <g fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round">
        <path d="M70 120 a34 34 0 1 1 60 -8"/>
      </g>
      <polygon points="132,86 150,104 118,110" fill="#fff"/>`),
  },
  {
    id: 'children',
    name: 'Children Crossing',
    category: 'Warning',
    description: 'Watch for children. Often near schools and playgrounds.',
    svg: warnTriangle(`
      <circle cx="82" cy="86" r="12" fill="#111"/>
      <path d="M74 104 h16 v34 h-16z" fill="#111"/>
      <circle cx="118" cy="92" r="10" fill="#111"/>
      <path d="M111 108 h14 v28 h-14z" fill="#111"/>`),
  },
  {
    id: 'pedestrian',
    name: 'Pedestrian Crossing',
    category: 'Warning',
    description: 'Pedestrian crossing ahead. Slow down and be ready to stop.',
    svg: warnTriangle(`
      <circle cx="100" cy="70" r="12" fill="#111"/>
      <path d="M92 86 h16 l10 40 h-12 l-6 -24 -6 24 h-12z" fill="#111"/>`),
  },
  {
    id: 'sharp-bend',
    name: 'Sharp Bend',
    category: 'Warning',
    description: 'A sharp bend or curve ahead. Reduce speed.',
    svg: warnTriangle(`
      <path d="M85 150 C85 110 120 110 120 90 C120 70 95 70 95 55" fill="none" stroke="#111" stroke-width="14" stroke-linecap="round"/>
      <polygon points="95,44 78,66 112,66" fill="#111"/>`),
  },
  {
    id: 'slippery',
    name: 'Slippery Road',
    category: 'Warning',
    description: 'Road may be slippery when wet. Drive with caution.',
    svg: warnTriangle(`
      <rect x="86" y="70" width="28" height="46" rx="6" fill="#111"/>
      <path d="M60 150 q20 -20 40 0 t40 0" fill="none" stroke="#111" stroke-width="10"/>
      <path d="M70 120 l-14 22 M130 120 l14 22" stroke="#111" stroke-width="8"/>`),
  },
  {
    id: 'roadworks',
    name: 'Road Works',
    category: 'Warning',
    description: 'Construction or maintenance ahead. Expect workers and equipment.',
    svg: warnTriangle(`
      <circle cx="100" cy="62" r="12" fill="#111"/>
      <path d="M92 78 h16 v20 h-16z" fill="#111"/>
      <rect x="70" y="120" width="60" height="14" fill="#111"/>
      <path d="M118 96 l24 24" stroke="#111" stroke-width="10"/>`),
  },
  {
    id: 'crossroads',
    name: 'Crossroads',
    category: 'Warning',
    description: 'A crossroads junction ahead. Watch for crossing traffic.',
    svg: warnTriangle(`
      <rect x="92" y="60" width="16" height="90" fill="#111"/>
      <rect x="60" y="92" width="80" height="16" fill="#111"/>`),
  },
  {
    id: 'traffic-signals',
    name: 'Traffic Signals Ahead',
    category: 'Warning',
    description: 'Traffic lights ahead. Be prepared to stop.',
    svg: warnTriangle(`
      <rect x="86" y="52" width="28" height="76" rx="8" fill="#111"/>
      <circle cx="100" cy="66" r="7" fill="#d21e2b"/>
      <circle cx="100" cy="88" r="7" fill="#ffce00"/>
      <circle cx="100" cy="110" r="7" fill="#4caf50"/>`),
  },
  {
    id: 'bumps',
    name: 'Speed Bumps',
    category: 'Warning',
    description: 'Bumps or uneven road surface ahead. Slow down.',
    svg: warnTriangle(`<path d="M50 140 q25 -46 50 0 M100 140 q25 -46 50 0" fill="none" stroke="#111" stroke-width="12"/>`),
  },
  {
    id: 'animals',
    name: 'Wild Animals',
    category: 'Warning',
    description: 'Wild or domestic animals may cross. Common on rural Kenyan roads.',
    svg: warnTriangle(`
      <path d="M70 132 v-24 l10 -14 q4 -18 14 -10 l6 12 h18 l10 -8 v10 l-8 8 v40" fill="#111"/>
      <path d="M112 96 l10 -18 M120 78 l6 -14" stroke="#111" stroke-width="7" fill="none"/>`),
  },
  {
    id: 'turn-left',
    name: 'Turn Left Ahead',
    category: 'Mandatory',
    description: 'You must turn left ahead.',
    svg: blueCircle(`<path d="M120 62 v40 h-40 l0 -0" fill="none"/>
      <path d="M126 118 h-38 v-30" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="88,64 66,92 110,92" fill="#fff"/>`),
  },
  {
    id: 'keep-left',
    name: 'Keep Left',
    category: 'Mandatory',
    description: 'Pass to the left of the sign or obstruction.',
    svg: blueCircle(`
      <path d="M124 60 L76 100 L124 140" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  {
    id: 'ahead-only',
    name: 'Ahead Only',
    category: 'Mandatory',
    description: 'Proceed straight ahead only.',
    svg: blueCircle(`
      <rect x="92" y="80" width="16" height="70" fill="#fff"/>
      <polygon points="100,44 72,86 128,86" fill="#fff"/>`),
  },
  {
    id: 'hospital',
    name: 'Hospital',
    category: 'Information',
    description: 'A hospital is nearby. Drive quietly and be alert for ambulances.',
    svg: blueRect(`
      <rect x="70" y="70" width="60" height="60" rx="6" fill="#fff"/>
      <rect x="94" y="80" width="12" height="40" fill="#0d5fbe"/>
      <rect x="80" y="94" width="40" height="12" fill="#0d5fbe"/>`),
  },
  {
    id: 'parking',
    name: 'Parking',
    category: 'Information',
    description: 'Designated parking area available.',
    svg: blueRect(`<text x="100" y="140" font-family="Arial" font-weight="bold" font-size="110" fill="#fff" text-anchor="middle">P</text>`),
  },
  {
    id: 'fuel',
    name: 'Fuel Station',
    category: 'Information',
    description: 'A petrol / fuel station is ahead.',
    svg: blueRect(`
      <rect x="76" y="66" width="42" height="70" rx="4" fill="#fff"/>
      <rect x="84" y="76" width="26" height="20" fill="#0d5fbe"/>
      <path d="M118 84 h10 v40 a8 8 0 0 1 -16 0" fill="none" stroke="#fff" stroke-width="8"/>`),
  },
  {
    id: 'pedestrian-zone',
    name: 'Bus Stop',
    category: 'Information',
    description: 'A designated bus stop / matatu stage.',
    svg: blueRect(`
      <rect x="70" y="72" width="60" height="46" rx="6" fill="#fff"/>
      <rect x="78" y="80" width="44" height="20" fill="#0d5fbe"/>
      <circle cx="84" cy="122" r="8" fill="#fff"/>
      <circle cx="116" cy="122" r="8" fill="#fff"/>`),
  },
];

export const CATEGORIES: SignCategory[] = ['Regulatory', 'Warning', 'Mandatory', 'Information'];

export const categoryColor: Record<SignCategory, string> = {
  Regulatory: '#d21e2b',
  Warning: '#e6a700',
  Mandatory: '#0d5fbe',
  Information: '#4caf50',
};
