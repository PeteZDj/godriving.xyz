// Offline fallback driving-school directory (used when the live API is
// unreachable). Curated East-African schools mirroring the seed set.

import type { School } from './types';

const logo = (name: string, color: string) =>
  `https://placehold.co/160x160/${color}/ffffff/png?text=${encodeURIComponent(name.split(' ').map((w) => w[0]).join('').slice(0, 2))}`;

export const FALLBACK_SCHOOLS: School[] = [
  { id: 1, name: 'AA Driving School', country: 'Kenya', city: 'Nairobi', description: "Kenya's most established driving school, with modern vehicles and certified instructors across 20+ branches.", phone: '+254 709 933 000', email: 'info@aakenya.co.ke', website: 'aakenya.co.ke', logo: logo('AA Driving School', '0071bc'), rating: 4.8, price_from: 15000, verified: true, featured: true },
  { id: 2, name: 'Peponi Driving School', country: 'Kenya', city: 'Nairobi', description: 'Friendly instructors, flexible schedules and a high first-time pass rate in Westlands and Ruaka.', phone: '+254 720 111 222', email: 'hello@peponidriving.co.ke', logo: logo('Peponi', '4caf50'), rating: 4.6, price_from: 12000, verified: true, featured: false },
  { id: 3, name: 'Glory Driving School', country: 'Kenya', city: 'Mombasa', description: 'Coast-based school specialising in manual and automatic classes with weekend options.', phone: '+254 733 445 566', email: 'glory@driving.co.ke', logo: logo('Glory', 'e6a700'), rating: 4.5, price_from: 11000, verified: true, featured: false },
  { id: 4, name: 'Kisumu Safe Drivers', country: 'Kenya', city: 'Kisumu', description: 'Lakeside driving academy focused on defensive driving and highway confidence.', phone: '+254 711 222 333', email: 'info@kisumusafe.co.ke', logo: logo('Kisumu Safe', '0d5fbe'), rating: 4.4, price_from: 10000, verified: true, featured: false },
  { id: 5, name: 'Kampala Motorists', country: 'Uganda', city: 'Kampala', description: 'Uganda\u2019s trusted academy with theory classes in English and Luganda.', phone: '+256 772 100 200', email: 'drive@kampalamotorists.ug', logo: logo('Kampala Motorists', 'd21e2b'), rating: 4.5, price_from: 400000, verified: true, featured: true },
  { id: 6, name: 'Dar Wheels Academy', country: 'Tanzania', city: 'Dar es Salaam', description: 'Modern simulators and patient instructors serving Dar es Salaam and Arusha.', phone: '+255 754 300 400', email: 'info@darwheels.co.tz', logo: logo('Dar Wheels', '2a93d5'), rating: 4.3, price_from: 250000, verified: true, featured: false },
  { id: 7, name: 'Kigali Drive Well', country: 'Rwanda', city: 'Kigali', description: 'Clean fleet, structured curriculum and strong theory prep for the Rwandan test.', phone: '+250 788 500 600', email: 'hello@drivewell.rw', logo: logo('Kigali Drive', '3d9140'), rating: 4.7, price_from: 90000, verified: true, featured: true },
  { id: 8, name: 'Eldoret Highway School', country: 'Kenya', city: 'Eldoret', description: 'Rift Valley academy known for thorough highway and roundabout training.', phone: '+254 722 909 090', email: 'info@eldorethighway.co.ke', logo: logo('Eldoret Highway', '005a96'), rating: 4.2, price_from: 9500, verified: false, featured: false },
];
