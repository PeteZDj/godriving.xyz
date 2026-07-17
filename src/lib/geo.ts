// Lightweight geolocation helpers used by signup (autofill) and schools (near me).

export interface Coords { lat: number; lng: number }

export function getPosition(options?: PositionOptions): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not supported on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. You can still type your city.'
            : 'Could not get your location. Please try again.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000, ...options }
    );
  });
}

export interface Place { city: string; country: string }

// Free, key-less reverse geocoding (BigDataCloud client endpoint).
export async function reverseGeocode({ lat, lng }: Coords): Promise<Place> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const d = await res.json();
  const city = d.city || d.locality || d.principalSubdivision || '';
  const country = d.countryName || '';
  return { city, country };
}

const R = 6371; // km
export function haversineKm(a: Coords, b: Coords): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
