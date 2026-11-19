import { API_URL } from '../config';
import { clearRefreshToken, getRefreshToken } from '../auth/storage';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** The phone could not reach the server (offline, timeout, server down). Not the user's fault, never logs them out. */
export class NetworkError extends Error {}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshing: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

function messageFrom(data: any, fallback: string): string {
  const m = data?.message;
  if (Array.isArray(m)) return m.join('\n');
  if (typeof m === 'string' && m) return m;
  return fallback;
}

async function raw(path: string, method: string, body: unknown, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError('Cannot reach eWork Social. Check your internet connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  return { res, data };
}

/**
 * Trades the stored refresh token for a new access token (single flight, so
 * several requests failing at once only refresh once). Returns null when the
 * refresh token is missing or rejected; throws NetworkError when the server
 * cannot be reached, so a bad connection never signs anyone out.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;
      const { res, data } = await raw('/auth/refresh', 'POST', { refreshToken }, null);
      if (res.ok && data?.accessToken) {
        accessToken = data.accessToken as string;
        return accessToken;
      }
      if (res.status === 401 || res.status === 403) {
        await clearRefreshToken();
        return null;
      }
      throw new NetworkError('The server is temporarily unavailable. Please try again.');
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const method = opts.method || 'GET';
  const auth = opts.auth !== false;

  let { res, data } = await raw(path, method, opts.body, auth ? accessToken : null);

  if (auth && res.status === 401) {
    const fresh = await refreshAccessToken();
    if (!fresh) {
      onUnauthorized?.();
      throw new ApiError(401, 'Your session has expired. Please log in again.');
    }
    ({ res, data } = await raw(path, method, opts.body, fresh));
  }

  if (!res.ok) {
    throw new ApiError(res.status, messageFrom(data, `Something went wrong (${res.status}). Please try again.`));
  }
  return data as T;
}
