import { parseAudiences, validateTokenInfo } from './google-id-token.util';

const AUD = ['web-client.apps.googleusercontent.com', 'android-client.apps.googleusercontent.com'];
const NOW = 1_800_000_000;

function good(over: Record<string, unknown> = {}) {
  return {
    iss: 'https://accounts.google.com',
    aud: AUD[0],
    sub: '1234567890',
    email: 'Jane@Example.com',
    email_verified: 'true',
    name: 'Jane Doe',
    picture: 'https://example.com/p.png',
    exp: String(NOW + 3000),
    ...over,
  };
}

describe('parseAudiences', () => {
  it('splits, trims and drops empties across several env values', () => {
    expect(parseAudiences(' a , b ,, ', undefined, 'c')).toEqual(['a', 'b', 'c']);
    expect(parseAudiences(undefined, '')).toEqual([]);
  });
});

describe('validateTokenInfo', () => {
  it('accepts a valid token and lowercases the email', () => {
    expect(validateTokenInfo(good(), AUD, NOW)).toEqual({
      sub: '1234567890',
      email: 'jane@example.com',
      name: 'Jane Doe',
      picture: 'https://example.com/p.png',
    });
  });

  it('accepts either Google issuer form and a boolean email_verified', () => {
    expect(() => validateTokenInfo(good({ iss: 'accounts.google.com', email_verified: true }), AUD, NOW)).not.toThrow();
  });

  it('rejects a token issued for a different app', () => {
    expect(() => validateTokenInfo(good({ aud: 'someone-elses-client' }), AUD, NOW)).toThrow(/different app/);
  });

  it('rejects the wrong issuer, an expired token and an unverified email', () => {
    expect(() => validateTokenInfo(good({ iss: 'https://evil.test' }), AUD, NOW)).toThrow(/issuer/);
    expect(() => validateTokenInfo(good({ exp: String(NOW - 1) }), AUD, NOW)).toThrow(/expired/);
    expect(() => validateTokenInfo(good({ email_verified: 'false' }), AUD, NOW)).toThrow(/not verified/);
    expect(() => validateTokenInfo(good({ email_verified: undefined }), AUD, NOW)).toThrow(/not verified/);
  });

  it('rejects missing account details, empty config and non-objects', () => {
    expect(() => validateTokenInfo(good({ sub: undefined }), AUD, NOW)).toThrow(/missing/);
    expect(() => validateTokenInfo(good(), [], NOW)).toThrow(/not configured/);
    expect(() => validateTokenInfo(null, AUD, NOW)).toThrow(/Invalid/);
  });

  it('falls back to the email prefix when Google sends no name', () => {
    expect(validateTokenInfo(good({ name: undefined }), AUD, NOW).name).toBe('jane');
  });
});
