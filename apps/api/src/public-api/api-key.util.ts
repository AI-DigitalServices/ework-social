import { createHash, randomBytes } from 'crypto';

// Pure helpers for workspace API keys. No framework imports.

export const API_SCOPES = ['clients:read', 'clients:write', 'posts:read', 'posts:write'] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export interface AuthedApiKey {
  id: string;
  name: string;
  workspaceId: string;
  scopes: string[];
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** New key: shown to the user once; only the hash is stored. */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `ewk_live_${randomBytes(24).toString('base64url')}`;
  return { key, prefix: key.slice(0, 13), hash: hashApiKey(key) };
}

export function looksLikeApiKey(s: unknown): s is string {
  return typeof s === 'string' && /^ewk_live_[A-Za-z0-9_-]{20,64}$/.test(s);
}

/** Accepts `Authorization: Bearer <key>` or `X-API-Key: <key>`. */
export function extractApiKey(headers: Record<string, any> | undefined): string | null {
  const auth = headers?.authorization;
  if (typeof auth === 'string') {
    const [type, value] = auth.split(' ');
    if (type?.toLowerCase() === 'bearer' && value?.trim()) return value.trim();
  }
  const x = headers?.['x-api-key'];
  if (typeof x === 'string' && x.trim()) return x.trim();
  return null;
}

export function normalizeScopes(input: unknown): ApiScope[] {
  if (!Array.isArray(input)) return [];
  const out: ApiScope[] = [];
  for (const s of input) {
    if ((API_SCOPES as readonly string[]).includes(s) && !out.includes(s as ApiScope)) out.push(s as ApiScope);
  }
  return out;
}

/** `x:write` also grants `x:read`. */
export function scopeAllows(granted: string[], required: string): boolean {
  if (!Array.isArray(granted)) return false;
  if (granted.includes(required)) return true;
  if (required.endsWith(':read')) return granted.includes(required.replace(/:read$/, ':write'));
  return false;
}

/** In-memory sliding window. Per server instance, which is fine as a safety net. */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(private windowMs = 60_000) {}

  hit(key: string, limit: number, now = Date.now()): { ok: boolean; retryAfterSec: number } {
    const cutoff = now - this.windowMs;
    const arr = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (arr.length >= limit) {
      this.hits.set(key, arr);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((arr[0] + this.windowMs - now) / 1000)) };
    }
    arr.push(now);
    this.hits.set(key, arr);
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (v[v.length - 1] <= cutoff) this.hits.delete(k);
    }
    return { ok: true, retryAfterSec: 0 };
  }
}

export const apiKeyLimiter = new SlidingWindowLimiter();
export const captureLimiter = new SlidingWindowLimiter();
