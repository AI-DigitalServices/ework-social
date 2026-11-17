import { canWrite, isFresh, isPublishable, isRetryable, snippet, toPostSummary } from './mobile-posts.util';

describe('mobile-posts.util', () => {
  it('only owners, admins and editors can change posts', () => {
    for (const r of ['OWNER', 'ADMIN', 'EDITOR']) expect(canWrite(r)).toBe(true);
    for (const r of ['VIEWER', '', undefined, null, 'GUEST']) expect(canWrite(r as any)).toBe(false);
  });

  it('publishable: draft, scheduled and failed; never pending approval or already published', () => {
    expect(isPublishable('DRAFT')).toBe(true);
    expect(isPublishable('SCHEDULED')).toBe(true);
    expect(isPublishable('FAILED')).toBe(true);
    expect(isPublishable('PENDING_APPROVAL')).toBe(false);
    expect(isPublishable('PUBLISHED')).toBe(false);
  });

  it('retryable: failed only', () => {
    expect(isRetryable('FAILED')).toBe(true);
    for (const s of ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'PENDING_APPROVAL']) expect(isRetryable(s)).toBe(false);
  });

  it('isFresh compares to the millisecond and rejects garbage', () => {
    const t = new Date('2026-11-17T10:00:00.123Z');
    expect(isFresh(t, '2026-11-17T10:00:00.123Z')).toBe(true);
    expect(isFresh(t, '2026-11-17T11:00:00.123+01:00')).toBe(true); // same instant, other offset
    expect(isFresh(t, '2026-11-17T10:00:00.124Z')).toBe(false);
    expect(isFresh(t, '2026-11-17T10:00:00Z')).toBe(false);
    expect(isFresh(t, 'not a date')).toBe(false);
    expect(isFresh(t, '')).toBe(false);
  });

  it('snippet trims and shortens', () => {
    expect(snippet('  hi ', 10)).toBe('hi');
    expect(snippet('abcdefghij', 5)).toBe('abcd…');
    expect(snippet(null, 5)).toBe('');
  });

  it('toPostSummary is slim and tolerant of missing relations', () => {
    const s = toPostSummary({ id: 'p1', content: 'x'.repeat(500), status: 'DRAFT', updatedAt: new Date(0), mediaUrls: ['a', 'b'], socialAccount: null });
    expect(s.content.length).toBeLessThanOrEqual(200);
    expect(s).toMatchObject({ id: 'p1', status: 'DRAFT', mediaCount: 2, platform: null, accountName: null, scheduledAt: null });
    expect(s).not.toHaveProperty('mediaUrls');
  });
});
