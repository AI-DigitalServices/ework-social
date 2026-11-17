import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export type OAuthProvider =
  | 'facebook'
  | 'linkedin'
  | 'linkedin-org'
  | 'youtube'
  | 'tiktok'
  | 'threads';

const STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthStatePayload {
  p: string; // provider
  w: string; // workspaceId
  u: string; // userId
  n: string; // nonce (reserved for one-time-use tracking later)
  e: number; // expiry, ms since epoch
  c?: 'app'; // optional: the connect was started from the mobile app
}

function stateKey(): Buffer {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('OAUTH_STATE_SECRET or JWT_SECRET must be set to sign OAuth state');
  }
  // Domain-separated so the signing key is never the raw JWT secret.
  return createHmac('sha256', secret).update('oauth-state-v1').digest();
}

function sign(payloadB64: string): string {
  return createHmac('sha256', stateKey()).update(payloadB64).digest('base64url');
}

/**
 * Builds a signed, expiring OAuth state bound to a provider, workspace and user.
 * Format: <base64url payload>.<base64url HMAC-SHA256 signature>
 */
export function signOAuthState(
  provider: OAuthProvider,
  workspaceId: string,
  userId: string,
  now: number = Date.now(),
  client?: 'app',
): string {
  const payload: OAuthStatePayload = {
    p: provider,
    w: workspaceId,
    u: userId,
    n: randomBytes(12).toString('hex'),
    e: now + STATE_TTL_MS,
    ...(client === 'app' ? { c: 'app' as const } : {}),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verifies signature, provider binding and expiry. Throws on any failure.
 * Legacy unsigned states (plain base64 JSON) are deliberately rejected.
 */
export function verifyOAuthState(
  provider: OAuthProvider,
  state: string,
  now: number = Date.now(),
): { workspaceId: string; userId: string; client?: 'app' } {
  if (typeof state !== 'string') throw new Error('Invalid OAuth state');
  const parts = state.split('.');
  if (parts.length !== 2) throw new Error('Invalid OAuth state');
  const [payloadB64, sig] = parts;

  const expected = Buffer.from(sign(payloadB64));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new Error('Invalid OAuth state signature');
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  } catch {
    throw new Error('Invalid OAuth state payload');
  }

  if (payload.p !== provider) throw new Error('OAuth state provider mismatch');
  if (typeof payload.e !== 'number' || now > payload.e) throw new Error('OAuth state expired');
  if (!payload.w || !payload.u) throw new Error('Invalid OAuth state payload');

  return {
    workspaceId: payload.w,
    userId: payload.u,
    ...(payload.c === 'app' ? { client: 'app' as const } : {}),
  };
}

/**
 * Reads ONLY the client flag from a state, for choosing where to send the user
 * after the provider redirects back. The signature is checked, so a forged flag
 * is ignored; expiry is deliberately not enforced here (it is enforced when the
 * connection is made) so a slow sign-in still lands back in the app. Never throws.
 */
export function readOAuthClient(state: unknown): 'app' | 'web' {
  try {
    if (typeof state !== 'string') return 'web';
    const parts = state.split('.');
    if (parts.length !== 2) return 'web';
    const [payloadB64, sig] = parts;
    const expected = Buffer.from(sign(payloadB64));
    const given = Buffer.from(sig);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return 'web';
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return payload?.c === 'app' ? 'app' : 'web';
  } catch {
    return 'web';
  }
}

const BLOCKED_APP_SCHEMES = ['javascript', 'data', 'file', 'vbscript', 'http', 'ftp'];

/** The configured app return address must be https or a custom app scheme. */
export function isSafeAppReturnUrl(url: string): boolean {
  const m = /^([a-z][a-z0-9+.-]*):\/\//i.exec((url || '').trim());
  if (!m) return false;
  return !BLOCKED_APP_SCHEMES.includes(m[1].toLowerCase());
}

/**
 * Where to send the user after an OAuth callback. Web connects go to the
 * dashboard settings page as before. Connects started from the app go to the
 * single address in MOBILE_OAUTH_RETURN_URL (e.g. eworksocial://oauth-return),
 * with the result appended. The state can only say "app" - it never carries a
 * URL, so there is no open redirect.
 */
export function buildOAuthReturnUrl(
  state: unknown,
  frontendUrl: string,
  query: string,
  appReturnUrl: string | undefined = process.env.MOBILE_OAUTH_RETURN_URL,
): string {
  const web = `${frontendUrl}/dashboard/settings?tab=social&${query}`;
  if (readOAuthClient(state) !== 'app') return web;
  const base = (appReturnUrl || '').trim();
  if (!isSafeAppReturnUrl(base)) return web;
  return `${base}${base.includes('?') ? '&' : '?'}${query}`;
}
