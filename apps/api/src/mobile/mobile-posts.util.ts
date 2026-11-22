// Pure helpers for the mobile post actions. No framework imports.

export const POST_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'PENDING_APPROVAL'] as const;
export type PostStatusName = (typeof POST_STATUSES)[number];

export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REVISION_REQUESTED'] as const;

const WRITER_ROLES = ['OWNER', 'ADMIN', 'EDITOR'];

/** VIEWER (typically a client user) can look, not change. */
export function canWrite(role: string | null | undefined): boolean {
  return !!role && WRITER_ROLES.includes(role);
}

/** Posts the app may publish right now. Never a post waiting for client approval, never one already live. */
export function isPublishable(status: string): boolean {
  return status === 'DRAFT' || status === 'SCHEDULED' || status === 'FAILED';
}

export function isRetryable(status: string): boolean {
  return status === 'FAILED';
}

/**
 * Freshness check: the app sends the updatedAt it last saw. Equal to the
 * millisecond means nobody changed the post since; anything else (or an
 * unparseable value) means "stale".
 */
export function isFresh(current: Date, expectedIso: string): boolean {
  const expected = new Date(expectedIso);
  if (Number.isNaN(expected.getTime())) return false;
  return current.getTime() === expected.getTime();
}

export function snippet(text: string | null | undefined, max: number): string {
  const t = (text || '').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

/** Slim post shape for lists and for conflict responses. */
export function toPostSummary(p: any) {
  return {
    id: p.id,
    content: snippet(p.content, 200),
    status: p.status,
    scheduledAt: p.scheduledAt ?? null,
    publishedAt: p.publishedAt ?? null,
    errorMessage: p.errorMessage ?? null,
    updatedAt: p.updatedAt,
    mediaCount: Array.isArray(p.mediaUrls) ? p.mediaUrls.length : 0,
    thumbUrl: Array.isArray(p.mediaUrls) && typeof p.mediaUrls[0] === 'string' ? p.mediaUrls[0] : null,
    platform: p.socialAccount?.platform ?? null,
    accountName: p.socialAccount?.accountName ?? null,
  };
}
