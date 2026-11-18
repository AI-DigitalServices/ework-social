import {
  SlidingWindowLimiter,
  extractApiKey,
  generateApiKey,
  hashApiKey,
  looksLikeApiKey,
  normalizeScopes,
  scopeAllows,
} from './api-key.util';

describe('api key generation', () => {
  it('makes a recognisable key whose hash matches and which is unique', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key).toMatch(/^ewk_live_/);
    expect(looksLikeApiKey(a.key)).toBe(true);
    expect(a.prefix).toBe(a.key.slice(0, 13));
    expect(a.hash).toBe(hashApiKey(a.key));
    expect(a.hash).not.toContain(a.key);
    expect(a.key).not.toBe(b.key);
  });

  it('rejects things that are not keys', () => {
    for (const s of ['', 'abc', 'ewk_live_', 'ewk_test_aaaaaaaaaaaaaaaaaaaaaaaa', 'eyJhbGciOi.JWT.token', undefined, 42]) {
      expect(looksLikeApiKey(s as any)).toBe(false);
    }
  });
});

describe('extractApiKey', () => {
  it('reads Bearer and X-API-Key', () => {
    expect(extractApiKey({ authorization: 'Bearer abc' })).toBe('abc');
    expect(extractApiKey({ authorization: 'bearer abc' })).toBe('abc');
    expect(extractApiKey({ 'x-api-key': ' xyz ' })).toBe('xyz');
  });
  it('returns null when absent or malformed', () => {
    expect(extractApiKey({})).toBeNull();
    expect(extractApiKey({ authorization: 'Basic abc' })).toBeNull();
    expect(extractApiKey(undefined)).toBeNull();
  });
});

describe('scopes', () => {
  it('normalizes to known, unique scopes', () => {
    expect(normalizeScopes(['clients:read', 'clients:read', 'admin:all', 5])).toEqual(['clients:read']);
    expect(normalizeScopes('clients:read')).toEqual([]);
  });
  it('write implies read, but not the other way round or across resources', () => {
    expect(scopeAllows(['clients:write'], 'clients:read')).toBe(true);
    expect(scopeAllows(['clients:read'], 'clients:write')).toBe(false);
    expect(scopeAllows(['clients:write'], 'posts:read')).toBe(false);
    expect(scopeAllows([], 'clients:read')).toBe(false);
  });
});

describe('SlidingWindowLimiter', () => {
  it('allows up to the limit then blocks, and recovers after the window', () => {
    const l = new SlidingWindowLimiter(60_000);
    for (let i = 0; i < 3; i++) expect(l.hit('k', 3, 1000 + i).ok).toBe(true);
    const blocked = l.hit('k', 3, 2000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(l.hit('k', 3, 1000 + 60_001).ok).toBe(true);
  });
  it('keeps keys separate', () => {
    const l = new SlidingWindowLimiter();
    expect(l.hit('a', 1).ok).toBe(true);
    expect(l.hit('a', 1).ok).toBe(false);
    expect(l.hit('b', 1).ok).toBe(true);
  });
});
