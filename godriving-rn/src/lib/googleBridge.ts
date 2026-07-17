// Browser-based Google sign-in bridge. Reuses the GoDriving website's Google
// login (godriving.xyz/mobile-signin.html), which verifies the credential
// server-side and hands the real GoDriving session back to the app via the
// `godriving://auth` deep link.

import * as WebBrowser from 'expo-web-browser';

const SITE = 'https://godriving.xyz';
export const GOOGLE_BRIDGE_URL = `${SITE}/mobile-signin.html`;
export const AUTH_REDIRECT = 'godriving://auth';

export interface GoogleBridgeResult {
  token: string;
  name: string;
  email: string;
  avatar?: string;
  city?: string;
  country?: string;
}

/** Opens the site's Google sign-in bridge in a secure browser tab and resolves
 * the profile/token returned via the app's deep-link scheme. Returns null if the
 * user cancels. Throws if the exchange fails. */
export async function googleBridgeSignIn(): Promise<GoogleBridgeResult | null> {
  const result = await WebBrowser.openAuthSessionAsync(GOOGLE_BRIDGE_URL, AUTH_REDIRECT);
  if (result.type !== 'success' || !result.url) return null;
  const frag = result.url.split('#')[1] || result.url.split('?')[1] || '';
  const params = new URLSearchParams(frag);
  const token = params.get('token') || '';
  if (!token) throw new Error('Google sign-in did not complete.');
  let avatar: string | undefined;
  let city: string | undefined;
  let country: string | undefined;
  const userB64 = params.get('user');
  const atob = (globalThis as any).atob as ((s: string) => string) | undefined;
  if (userB64 && typeof atob === 'function') {
    try {
      const u = JSON.parse(decodeURIComponent(escape(atob(userB64))));
      avatar = u.avatar || u.image || u.picture;
      city = u.city;
      country = u.country;
    } catch {
      /* optional extras */
    }
  }
  return {
    token,
    name: params.get('name') || 'Driver',
    email: params.get('email') || '',
    avatar,
    city,
    country,
  };
}
