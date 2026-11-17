import { describeKeyError, looksLikeAnthropicKey } from './llm-client.util';

describe('llm-client util', () => {
  it('accepts keys shaped like Anthropic keys', () => {
    expect(looksLikeAnthropicKey('sk-ant-api03-' + 'a'.repeat(40))).toBe(true);
    expect(looksLikeAnthropicKey('  sk-ant-' + 'B_c-9'.repeat(8) + '  ')).toBe(true);
  });

  it('rejects other providers, short strings and empty input', () => {
    expect(looksLikeAnthropicKey('sk-proj-' + 'a'.repeat(40))).toBe(false);
    expect(looksLikeAnthropicKey('sk-ant-short')).toBe(false);
    expect(looksLikeAnthropicKey('')).toBe(false);
    expect(looksLikeAnthropicKey(undefined as any)).toBe(false);
  });

  it('explains an invalid or revoked key', () => {
    expect(describeKeyError({ status: 401, message: '401 authentication_error' })).toMatch(/invalid or has been revoked/);
  });

  it('explains missing permission and rate limits', () => {
    expect(describeKeyError({ status: 403 })).toMatch(/permission/);
    expect(describeKeyError({ status: 429, message: 'rate_limit_error' })).toMatch(/rate-limited/);
  });

  it('explains an account with no credit, whatever the status code', () => {
    const err = { status: 400, error: { error: { message: 'Your credit balance is too low to access the Anthropic API.' } } };
    expect(describeKeyError(err)).toMatch(/no credit/);
  });

  it('falls back to the provider message, then to a generic one', () => {
    expect(describeKeyError({ status: 500, message: 'overloaded' })).toBe('overloaded');
    expect(describeKeyError({})).toBe('unknown error.');
  });
});
