import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { MobilePostsService } from './mobile-posts.service';

const UPDATED = new Date('2026-11-20T10:00:00.000Z');
const SEEN = UPDATED.toISOString();
const inAnHour = () => new Date(Date.now() + 3600_000).toISOString();

const basePost = (over: any = {}) => ({
  id: 'p1',
  workspaceId: 'w1',
  content: 'Hello',
  mediaUrls: [],
  status: 'DRAFT',
  scheduledAt: null,
  publishedAt: null,
  errorMessage: null,
  updatedAt: UPDATED,
  socialAccount: { platform: 'INSTAGRAM', accountName: 'acme' },
  ...over,
});

function build(post: any = basePost(), role: string | null = 'OWNER', count = 1) {
  const prisma: any = {
    post: {
      findUnique: jest.fn().mockResolvedValue(post),
      updateMany: jest.fn().mockResolvedValue({ count }),
      deleteMany: jest.fn().mockResolvedValue({ count }),
    },
    workspaceMember: { findFirst: jest.fn().mockResolvedValue(role ? { role } : null) },
    workspace: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'someone-else' }) },
  };
  const planGuard: any = { assertCanWrite: jest.fn().mockResolvedValue(undefined) };
  const scheduler: any = {};
  return { svc: new MobilePostsService(prisma, planGuard, scheduler), prisma };
}

describe('MobilePostsService.editPost', () => {
  it('saves new text, guarded by the version the app saw', async () => {
    const { svc, prisma } = build();
    const r = await svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, content: '  New text  ' });
    expect(r.ok).toBe(true);
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', updatedAt: UPDATED, status: 'DRAFT' },
      data: { content: 'New text' },
    });
  });

  it('schedules a draft for a future time', async () => {
    const { svc, prisma } = build();
    const at = inAnHour();
    await svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, status: 'SCHEDULED', scheduledAt: at });
    const data = prisma.post.updateMany.mock.calls[0][0].data;
    expect(data.status).toBe('SCHEDULED');
    expect(data.scheduledAt).toEqual(new Date(at));
    expect(data.errorMessage).toBeNull();
  });

  it('unschedules to a draft', async () => {
    const { svc, prisma } = build(basePost({ status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 7200_000) }));
    await svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, status: 'DRAFT' });
    expect(prisma.post.updateMany.mock.calls[0][0].data).toEqual({ status: 'DRAFT', scheduledAt: null, errorMessage: null });
  });

  it('refuses a time in the past or too close', async () => {
    const { svc } = build();
    await expect(
      svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, status: 'SCHEDULED', scheduledAt: new Date(Date.now() - 1000).toISOString() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses blank text and text too long for the platform', async () => {
    const { svc } = build();
    await expect(svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, content: '   ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, content: 'x'.repeat(2201) })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses published posts and posts waiting for approval', async () => {
    for (const status of ['PUBLISHED', 'PENDING_APPROVAL']) {
      const { svc } = build(basePost({ status }));
      await expect(svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, content: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('refuses an empty change and a time without a schedule', async () => {
    const { svc } = build();
    await expect(svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, scheduledAt: inAnHour() })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('answers 409 when the post changed since the app loaded it', async () => {
    const stale = build();
    await expect(
      stale.svc.editPost('p1', 'u1', { expectedUpdatedAt: new Date('2026-11-20T09:00:00.000Z').toISOString(), content: 'x' }),
    ).rejects.toBeInstanceOf(ConflictException);
    const raced = build(basePost(), 'OWNER', 0);
    await expect(raced.svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, content: 'x' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps viewers out', async () => {
    const { svc, prisma } = build(basePost(), 'VIEWER');
    await expect(svc.editPost('p1', 'u1', { expectedUpdatedAt: SEEN, content: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.post.updateMany).not.toHaveBeenCalled();
  });
});

describe('MobilePostsService.deletePost', () => {
  it('deletes a draft, guarded by the version the app saw', async () => {
    const { svc, prisma } = build();
    expect(await svc.deletePost('p1', 'u1', SEEN)).toEqual({ ok: true });
    expect(prisma.post.deleteMany).toHaveBeenCalledWith({ where: { id: 'p1', updatedAt: UPDATED, status: 'DRAFT' } });
  });

  it('refuses published posts and posts waiting for approval', async () => {
    for (const status of ['PUBLISHED', 'PENDING_APPROVAL']) {
      const { svc, prisma } = build(basePost({ status }));
      await expect(svc.deletePost('p1', 'u1', SEEN)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.post.deleteMany).not.toHaveBeenCalled();
    }
  });

  it('answers 409 when the post changed, and keeps viewers out', async () => {
    const raced = build(basePost(), 'OWNER', 0);
    await expect(raced.svc.deletePost('p1', 'u1', SEEN)).rejects.toBeInstanceOf(ConflictException);
    const viewer = build(basePost(), 'VIEWER');
    await expect(viewer.svc.deletePost('p1', 'u1', SEEN)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
