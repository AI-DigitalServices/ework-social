// Pure helpers for the workspace's own Claude (Anthropic) key. No framework
// imports, so they are trivially unit-testable.

/** Anthropic API keys start with "sk-ant-". Cheap sanity check before a live test call. */
export function looksLikeAnthropicKey(key: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test((key || '').trim());
}

/** Turns an Anthropic SDK error into one plain sentence a customer can act on. */
export function describeKeyError(err: any): string {
  const status: number | undefined = err?.status ?? err?.response?.status;
  const message: string = err?.error?.error?.message || err?.message || '';
  if (status === 401) return 'the key is invalid or has been revoked.';
  if (status === 403) return 'the key does not have permission to use this model.';
  if (/credit balance/i.test(message)) {
    return 'the Anthropic account has no credit. Add credit in the Anthropic console and try again.';
  }
  if (status === 429) return 'the key is rate-limited right now. Wait a minute and try again.';
  return message || 'unknown error.';
}
