import {
  buildOAuthReturnUrl,
  isSafeAppReturnUrl,
  readOAuthClient,
  signOAuthState,
  verifyOAuthState,
} from './oauth-state.util';

const FRONT = 'https://app.eworksocial.com';
const APP = 'eworksocial://oauth-return';

describe('oauth state: app client flag', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-oauth-return';
  });

  it('web states are unchanged: no client key, verify works as before', () => {
    const s = signOAuthState('linkedin', 'w1', 'u1');
    expect(verifyOAuthState('linkedin', s)).toEqual({ workspaceId: 'w1', userId: 'u1' });
    expect(readOAuthClient(s)).toBe('web');
  });

  it('app states carry the flag and still verify provider, workspace and user', () => {
    const s = signOAuthState('tiktok', 'w1', 'u1', undefined, 'app');
    expect(verifyOAuthState('tiktok', s)).toEqual({ workspaceId: 'w1', userId: 'u1', client: 'app' });
    expect(() => verifyOAuthState('linkedin', s)).toThrow(/provider mismatch/);
    expect(readOAuthClient(s)).toBe('app');
  });

  it('a forged flag fails the signature and falls back to web', () => {
    const web = signOAuthState('linkedin', 'w1', 'u1');
    const [payloadB64, sig] = web.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    payload.c = 'app';
    const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;
    expect(readOAuthClient(forged)).toBe('web');
    expect(() => verifyOAuthState('linkedin', forged)).toThrow(/signature/);
  });

  it('garbage input never throws and means web', () => {
    for (const bad of [undefined, null, '', 'abc', 'a.b.c', 42, {}]) {
      expect(readOAuthClient(bad as any)).toBe('web');
    }
  });

  it('an expired app state still routes back to the app (expiry is enforced on connect, not here)', () => {
    const old = signOAuthState('youtube', 'w1', 'u1', Date.now() - 60 * 60 * 1000, 'app');
    expect(readOAuthClient(old)).toBe('app');
    expect(() => verifyOAuthState('youtube', old)).toThrow(/expired/);
  });
});

describe('isSafeAppReturnUrl', () => {
  it('accepts https and custom app schemes', () => {
    expect(isSafeAppReturnUrl('eworksocial://oauth-return')).toBe(true);
    expect(isSafeAppReturnUrl('https://eworksocial.com/app/oauth-return')).toBe(true);
  });

  it('rejects empty, plain http, script-capable and file schemes', () => {
    for (const bad of ['', '  ', 'http://evil.test', 'javascript://%0aalert(1)', 'data://x', 'file:///etc/passwd', 'notaurl']) {
      expect(isSafeAppReturnUrl(bad)).toBe(false);
    }
  });
});

describe('buildOAuthReturnUrl', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-oauth-return';
  });

  const web = `${FRONT}/dashboard/settings?tab=social&success=connected`;

  it('web state goes to the web settings page', () => {
    const s = signOAuthState('linkedin', 'w1', 'u1');
    expect(buildOAuthReturnUrl(s, FRONT, 'success=connected', APP)).toBe(web);
  });

  it('missing state (provider cancelled) goes to the web page', () => {
    expect(buildOAuthReturnUrl(undefined, FRONT, 'success=connected', APP)).toBe(web);
  });

  it('app state goes to the fixed app address with the result appended', () => {
    const s = signOAuthState('linkedin', 'w1', 'u1', undefined, 'app');
    expect(buildOAuthReturnUrl(s, FRONT, 'success=connected', APP)).toBe(`${APP}?success=connected`);
    expect(buildOAuthReturnUrl(s, FRONT, 'error=failed', `${APP}?src=oauth`)).toBe(`${APP}?src=oauth&error=failed`);
  });

  it('app state with no or unsafe configured address falls back to web', () => {
    const s = signOAuthState('linkedin', 'w1', 'u1', undefined, 'app');
    expect(buildOAuthReturnUrl(s, FRONT, 'success=connected', '')).toBe(web);
    expect(buildOAuthReturnUrl(s, FRONT, 'success=connected', 'javascript://x')).toBe(web);
  });

  it('the state can never choose the destination', () => {
    // The only thing a state can say is "app" or not; there is no URL field to abuse.
    const s = signOAuthState('linkedin', 'w1', 'u1', undefined, 'app');
    const payload = JSON.parse(Buffer.from(s.split('.')[0], 'base64url').toString());
    expect(Object.keys(payload).sort()).toEqual(['c', 'e', 'n', 'p', 'u', 'w']);
    expect(payload.c).toBe('app');
  });
});
