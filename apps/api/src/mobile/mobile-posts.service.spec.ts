import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MobilePostsService } from './mobile-posts.service';

const T = new Date('2026-11-17T10:00:00.000Z');
const STAMP = T.toISOString();

function post(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    workspaceId: 'w1',
    content: 'hello',
    mediaUrls: [],
    status: 'DRAFT',
    scheduledAt: null,
    publishedAt: null,
    errorMessage: null,
    updatedAt: T,
    socialAccount: { platform: 'LINKEDIN', accountName: 'Jben' },
    ...over,
  };
}

function build(p: any = post(), role: string | null = 'EDITOR') {
  const prisma: any = {
    post: {
      findUnique: jest.fn().mockResolvedValue(p),
      findFirst: jest.fn().mockResolvedValue({ id: 'c1' }),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    workspaceMember: { findFirst: jest.fn().mockResolvedValue(role ? { role } : null) },
    workspace: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'someone-else' }) },
    postApproval: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
  };
  const planGuard: any = { assertCanWrite: jest.fn().mockResolvedValue({}) };
  const scheduler: any = { publishNow: jest.fn().mockResolvedValue({}) };
  return { prisma, planGuard, scheduler, svc: new MobilePostsService(prisma, planGuard, scheduler) };
}

async function thrown(p: Promise<unknown>): Promise<any> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error('expected a throw');
}

describe('MobilePostsService.publishNow', () => {
  it('a non-member sees a 404, never a hint the post exists', async () => {
    const { svc, scheduler } = build(post(), null);
    expect(await thrown(svc.publishNow('p1', 'u1', STAMP))).toBeInstanceOf(NotFoundException);
    expect(scheduler.publishNow).not.toHaveBeenCalled();
  });

  it('a legacy owner without a membership row still has access', async () => {
    const { svc, prisma, scheduler } = build(post(), null);
    prisma.workspace.findUnique.mockResolvedValue({ ownerId: 'u1' });
    await svc.publishNow('p1', 'u1', STAMP);
    expect(scheduler.publishNow).toHaveBeenCalledWith('p1', 'u1');
  });

  it('a viewer is refused', async () => {
    const { svc, scheduler } = build(post(), 'VIEWER');
    expect(await thrown(svc.publishNow('p1', 'u1', STAMP))).toBeInstanceOf(ForbiddenException);
    expect(scheduler.publishNow).not.toHaveBeenCalled();
  });

  it('a read-only workspace (expired trial) is refused', async () => {
    const { svc, planGuard, scheduler } = build();
    planGuard.assertCanWrite.mockRejectedValue(new ForbiddenException('trial ended'));
    expect(await thrown(svc.publishNow('p1', 'u1', STAMP))).toBeInstanceOf(ForbiddenException);
    expect(scheduler.publishNow).not.toHaveBeenCalled();
  });

  it('a stale view is refused with 409 and the current post', async () => {
    const { svc, prisma, scheduler } = build();
    const err = await thrown(svc.publishNow('p1', 'u1', '2026-11-17T09:00:00.000Z'));
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({ code: 'STALE_POST', post: { id: 'p1' } });
    expect(prisma.post.updateMany).not.toHaveBeenCalled();
    expect(scheduler.publishNow).not.toHaveBeenCalled();
  });

  it('a post waiting for client approval cannot be published', async () => {
    const { svc, scheduler } = build(post({ status: 'PENDING_APPROVAL' }));
    const err = await thrown(svc.publishNow('p1', 'u1', STAMP));
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toMatch(/client approval/);
    expect(scheduler.publishNow).not.toHaveBeenCalled();
  });

  it('an already published post cannot be published again', async () => {
    const { svc, scheduler } = build(post({ status: 'PUBLISHED' }));
    const err = await thrown(svc.publishNow('p1', 'u1', STAMP));
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toMatch(/already published/);
    expect(scheduler.publishNow).not.toHaveBeenCalled();
  });

  it('losing the compare-and-set race (a second tap) gives 409 and publishes nothing', async () => {
    const { svc, prisma, scheduler } = build();
    prisma.post.updateMany.mockResolvedValue({ count: 0 });
    expect(await thrown(svc.publishNow('p1', 'u1', STAMP))).toBeInstanceOf(ConflictException);
    expect(scheduler.publishNow).not.toHaveBeenCalled();
  });

  it('the happy path claims the post exactly as seen, then publishes once', async () => {
    const { svc, prisma, scheduler } = build();
    const res = await svc.publishNow('p1', 'u1', STAMP);
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', updatedAt: T, status: 'DRAFT' },
      data: { errorMessage: null },
    });
    expect(scheduler.publishNow).toHaveBeenCalledTimes(1);
    expect(scheduler.publishNow).toHaveBeenCalledWith('p1', 'u1');
    expect(res.ok).toBe(true);
  });

  it('a platform failure comes back as a clear 400 with the refreshed post', async () => {
    const { svc, scheduler } = build();
    scheduler.publishNow.mockRejectedValue(new Error('LinkedIn token expired'));
    const err = await thrown(svc.publishNow('p1', 'u1', STAMP));
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse()).toMatchObject({ code: 'PUBLISH_FAILED', message: expect.stringContaining('LinkedIn token expired') });
  });
});

describe('MobilePostsService.retry', () => {
  it('only failed posts can be retried', async () => {
    const { svc, prisma } = build(post({ status: 'PUBLISHED' }));
    expect(await thrown(svc.retry('p1', 'u1', STAMP))).toBeInstanceOf(BadRequestException);
    expect(prisma.post.updateMany).not.toHaveBeenCalled();
  });

  it('a failed post goes back to scheduled with its error cleared, via compare-and-set', async () => {
    const { svc, prisma } = build(post({ status: 'FAILED', errorMessage: 'boom' }));
    await svc.retry('p1', 'u1', STAMP);
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', updatedAt: T, status: 'FAILED' },
      data: { status: 'SCHEDULED', errorMessage: null },
    });
  });

  it('a viewer cannot retry', async () => {
    const { svc } = build(post({ status: 'FAILED' }), 'VIEWER');
    expect(await thrown(svc.retry('p1', 'u1', STAMP))).toBeInstanceOf(ForbiddenException);
  });
});

describe('MobilePostsService reads', () => {
  it('the post list validates the status filter and is scoped to the workspace', async () => {
    const { svc, prisma } = build();
    expect(await thrown(svc.listPosts('w1', 'NOPE'))).toBeInstanceOf(BadRequestException);
    await svc.listPosts('w1', 'FAILED', undefined, '5');
    expect(prisma.post.findMany.mock.calls[0][0]).toMatchObject({ where: { workspaceId: 'w1', status: 'FAILED' }, take: 6 });
  });

  it("the post list rejects a cursor from another workspace", async () => {
    const { svc, prisma } = build();
    prisma.post.findFirst.mockResolvedValue(null);
    expect(await thrown(svc.listPosts('w1', undefined, 'foreign'))).toBeInstanceOf(BadRequestException);
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it('post list pages: next cursor only when there is more', async () => {
    const { svc, prisma } = build();
    prisma.post.findMany.mockResolvedValue([post({ id: 'a' }), post({ id: 'b' }), post({ id: 'c' })]);
    const res = await svc.listPosts('w1', undefined, undefined, '2');
    expect(res.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(res.nextCursor).toBe('b');
  });

  it("the approvals list never selects the client's review token", async () => {
    const { svc, prisma } = build();
    await svc.listApprovals('w1', 'PENDING');
    const arg = prisma.postApproval.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ workspaceId: 'w1', status: 'PENDING' });
    expect(arg.select).not.toHaveProperty('token');
    expect(await thrown(svc.listApprovals('w1', 'WHATEVER'))).toBeInstanceOf(BadRequestException);
  });

  it('the post detail tells the app whether the caller may edit', async () => {
    const viewer = build(post(), 'VIEWER');
    expect((await viewer.svc.getPost('p1', 'u1')).canEdit).toBe(false);
    const editor = build(post(), 'EDITOR');
    expect((await editor.svc.getPost('p1', 'u1')).canEdit).toBe(true);
  });
});
