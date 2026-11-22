// Pure helpers for photos used by the app. No framework imports.

type Env = Record<string, string | undefined>;

/** The public address prefix of this workspace's own uploads in the media bucket, or null when storage is not set up. */
export function mediaPrefix(workspaceId: string, env: Env = process.env): string | null {
  const base = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return null;
  const bucket = (env.SUPABASE_BUCKET || 'media').trim();
  return `${base}/storage/v1/object/public/${bucket}/${workspaceId}/`;
}

/**
 * True only for a file this workspace uploaded itself: the exact prefix, then a content-addressed name
 * (<sha256>.<ext>). Anything else (another host, another workspace, paths, queries) is refused, so the server can
 * never be pointed at an arbitrary address.
 */
export function isOwnMediaUrl(url: unknown, workspaceId: string, env: Env = process.env): boolean {
  if (typeof url !== 'string' || url.length > 500) return false;
  if (!/^[a-z0-9]{8,64}$/i.test(workspaceId || '')) return false;
  const prefix = mediaPrefix(workspaceId, env);
  if (!prefix || !url.startsWith(prefix)) return false;
  return /^[a-f0-9]{64}\.[a-z0-9]{1,5}$/i.test(url.slice(prefix.length));
}
