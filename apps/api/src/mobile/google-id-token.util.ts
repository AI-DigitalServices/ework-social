// Pure helpers for verifying a Google ID token sent by the mobile app.
// No framework imports, so they are trivially unit-testable.
import axios from 'axios';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/** Turns one or more comma-separated env values into a clean list of client IDs. */
export function parseAudiences(...values: Array<string | undefined>): string[] {
  return values
    .flatMap((v) => (v || '').split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Checks the claims Google's tokeninfo endpoint returned. Google has already
 * verified the signature; we check that the token is for OUR app, is current,
 * and that the email is verified. Throws a plain Error with a customer-safe message.
 */
export function validateTokenInfo(
  info: any,
  audiences: string[],
  nowSec: number = Math.floor(Date.now() / 1000),
): GoogleProfile {
  if (!info || typeof info !== 'object') throw new Error('Invalid Google token.');
  if (audiences.length === 0) throw new Error('Google sign-in is not configured.');
  if (!GOOGLE_ISSUERS.includes(info.iss)) throw new Error('Google token has the wrong issuer.');
  if (!audiences.includes(info.aud)) throw new Error('Google token was issued for a different app.');
  const exp = Number(info.exp);
  if (!exp || exp <= nowSec) throw new Error('Google token has expired.');
  if (!(info.email_verified === true || info.email_verified === 'true')) {
    throw new Error('Your Google email address is not verified.');
  }
  if (!info.sub || !info.email) throw new Error('Google token is missing account details.');
  const email = String(info.email).toLowerCase();
  return {
    sub: String(info.sub),
    email,
    name: info.name ? String(info.name) : email.split('@')[0],
    picture: info.picture ? String(info.picture) : undefined,
  };
}

/** Asks Google to verify the token's signature and return its claims. */
export async function fetchTokenInfo(idToken: string, http: typeof axios = axios): Promise<any> {
  const res = await http.get('https://oauth2.googleapis.com/tokeninfo', {
    params: { id_token: idToken },
    timeout: 8000,
  });
  return res.data;
}
