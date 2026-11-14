import { signOAuthState, verifyOAuthState } from './oauth-state.util';

describe('oauth-state', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, JWT_SECRET: 'test-secret' };
    delete process.env.OAUTH_STATE_SECRET;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('round-trips workspace and user', () => {
    const s = signOAuthState('facebook', 'ws1', 'u1');
    expect(verifyOAuthState('facebook', s)).toEqual({ workspaceId: 'ws1', userId: 'u1' });
  });

  it('rejects a tampered payload', () => {
    const s = signOAuthState('facebook', 'ws1', 'u1');
    const [payloadB64, sig] = s.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    payload.w = 'victim-workspace';
    const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;
    expect(() => verifyOAuthState('facebook', forged)).toThrow();
  });

  it('rejects the wrong provider', () => {
    const s = signOAuthState('linkedin', 'ws1', 'u1');
    expect(() => verifyOAuthState('linkedin-org', s)).toThrow('provider mismatch');
  });

  it('rejects an expired state', () => {
    const s = signOAuthState('youtube', 'ws1', 'u1');
    expect(() => verifyOAuthState('youtube', s, Date.now() + 11 * 60 * 1000)).toThrow('expired');
  });

  it('accepts a state just inside the expiry window', () => {
    const s = signOAuthState('tiktok', 'ws1', 'u1');
    expect(() => verifyOAuthState('tiktok', s, Date.now() + 9 * 60 * 1000)).not.toThrow();
  });

  it('rejects the legacy unsigned base64 format', () => {
    const legacy = Buffer.from(JSON.stringify({ workspaceId: 'ws1', userId: 'u1' })).toString('base64');
    expect(() => verifyOAuthState('facebook', legacy)).toThrow();
  });

  it('rejects malformed input', () => {
    expect(() => verifyOAuthState('facebook', '')).toThrow();
    expect(() => verifyOAuthState('facebook', 'a.b.c')).toThrow();
    expect(() => verifyOAuthState('facebook', undefined as any)).toThrow();
  });

  it('refuses to sign when no secret is configured', () => {
    delete process.env.JWT_SECRET;
    delete process.env.OAUTH_STATE_SECRET;
    expect(() => signOAuthState('facebook', 'ws1', 'u1')).toThrow();
  });
});
