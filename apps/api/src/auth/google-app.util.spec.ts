import { isGoogleAppState, signGoogleAppCode, signGoogleAppState, verifyGoogleAppCode } from './google-app.util';

describe('google app sign-in helpers', () => {
  const OLD = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-for-google-app-helpers';
  });
  afterAll(() => {
    process.env.JWT_SECRET = OLD;
  });

  describe('state', () => {
    it('recognises a state it signed', () => {
      expect(isGoogleAppState(signGoogleAppState())).toBe(true);
    });
    it('rejects missing, garbage and tampered states', () => {
      expect(isGoogleAppState(undefined)).toBe(false);
      expect(isGoogleAppState('nope')).toBe(false);
      const s = signGoogleAppState();
      const [payload] = s.split('.');
      expect(isGoogleAppState(`${payload}.AAAA`)).toBe(false);
      const forged = Buffer.from(JSON.stringify({ c: 'app', n: 'x', e: 1 })).toString('base64url');
      expect(isGoogleAppState(`${forged}.${s.split('.')[1]}`)).toBe(false);
    });
    it('a code is not accepted as a state, and a state is not accepted as a code', () => {
      expect(isGoogleAppState(signGoogleAppCode('u1', 'a@b.com'))).toBe(false);
      expect(() => verifyGoogleAppCode(signGoogleAppState())).toThrow();
    });
  });

  describe('code', () => {
    it('returns the user for a fresh code', () => {
      const code = signGoogleAppCode('user-1', 'a@b.com');
      expect(verifyGoogleAppCode(code)).toEqual({ userId: 'user-1', email: 'a@b.com' });
    });
    it('works only once', () => {
      const code = signGoogleAppCode('user-1', 'a@b.com');
      verifyGoogleAppCode(code);
      expect(() => verifyGoogleAppCode(code)).toThrow('Code already used');
    });
    it('expires after 90 seconds', () => {
      const t = 1_000_000;
      const code = signGoogleAppCode('user-1', 'a@b.com', t);
      expect(() => verifyGoogleAppCode(code, t + 91_000)).toThrow('Code expired');
    });
    it('rejects garbage and tampered codes', () => {
      expect(() => verifyGoogleAppCode(undefined)).toThrow();
      expect(() => verifyGoogleAppCode('a.b')).toThrow();
      const code = signGoogleAppCode('user-1', 'a@b.com');
      const [, sig] = code.split('.');
      const forged = Buffer.from(JSON.stringify({ u: 'admin', m: 'x@y.com', n: 'n1', e: Date.now() + 60000 })).toString('base64url');
      expect(() => verifyGoogleAppCode(`${forged}.${sig}`)).toThrow();
    });
  });
});
