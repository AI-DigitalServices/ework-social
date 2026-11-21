import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Google sign-in from the mobile app.
 *
 * The app opens /auth/google?client=app in a browser sheet. The API puts a signed "this came from the app" state on
 * the trip to Google. When Google comes back, the API sends the browser to the app's return link with a short-lived,
 * single-use CODE (never the login tokens), and the app swaps that code for tokens with one POST. So no token ever
 * sits in a link that another app on the phone could read.
 */

const STATE_TTL_MS = 10 * 60 * 1000;
const CODE_TTL_MS = 90 * 1000;

function key(purpose: string): Buffer {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('OAUTH_STATE_SECRET or JWT_SECRET must be set to sign Google app sign-in state');
  }
  // Domain-separated per purpose, so a state can never be used as a code (or the reverse).
  return createHmac('sha256', secret).update(purpose).digest();
}

function seal(purpose: string, payload: object): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', key(purpose)).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

/** Returns the payload when the signature is genuine, otherwise null. Expiry is checked by the callers. */
function open<T>(purpose: string, token: unknown): T | null {
  try {
    if (typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [b64, sig] = parts;
    const expected = Buffer.from(createHmac('sha256', key(purpose)).update(b64).digest('base64url'));
    const given = Buffer.from(sig);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    return JSON.parse(Buffer.from(b64, 'base64url').toString()) as T;
  } catch {
    return null;
  }
}

/** State that rides to Google and back, marking the sign-in as started from the app. */
export function signGoogleAppState(now: number = Date.now()): string {
  return seal('google-app-state-v1', { c: 'app', n: randomBytes(12).toString('hex'), e: now + STATE_TTL_MS });
}

/**
 * True when the state is genuine and was issued for the app. Expiry is deliberately not enforced: a slow sign-in
 * should still land back in the app, and the state carries nothing but "app".
 */
export function isGoogleAppState(state: unknown): boolean {
  const p = open<{ c?: string }>('google-app-state-v1', state);
  return p?.c === 'app';
}

const usedNonces = new Map<string, number>();

function purgeUsed(now: number) {
  for (const [n, exp] of usedNonces) if (exp < now) usedNonces.delete(n);
}

/** The one-time code handed to the app. Valid for 90 seconds. */
export function signGoogleAppCode(userId: string, email: string, now: number = Date.now()): string {
  return seal('google-app-code-v1', { u: userId, m: email, n: randomBytes(12).toString('hex'), e: now + CODE_TTL_MS });
}

/** Checks the code and burns it: a second try with the same code fails. Throws on any problem. */
export function verifyGoogleAppCode(code: unknown, now: number = Date.now()): { userId: string; email: string } {
  const p = open<{ u?: string; m?: string; n?: string; e?: number }>('google-app-code-v1', code);
  if (!p || !p.u || !p.m || !p.n || typeof p.e !== 'number') throw new Error('Invalid code');
  if (now > p.e) throw new Error('Code expired');
  purgeUsed(now);
  if (usedNonces.has(p.n)) throw new Error('Code already used');
  usedNonces.set(p.n, p.e);
  return { userId: p.u, email: p.m };
}
