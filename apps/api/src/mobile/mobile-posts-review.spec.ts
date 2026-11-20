import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { MobilePostsService } from './mobile-posts.service';

const UPDATED = new Date('2026-11-20T10:00:00.000Z');
const SEEN = UPDATED.toISOString();

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

function build(post: any = basePost(), role: string = 'OWNER', existing: any = null, planError?: Error) {
  const prisma: any = {
    post: { findUnique: jest.fn().mockResolvedValue(post), update: jest.fn(), updateMany: jest.fn() },
    workspaceMember: { findFirst: jest.fn().mockResolvedValue({ role }) },
    workspace: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'someone-else' }) },
    postApproval: {
      findUnique: jest.fn().mockResolvedValue(existing),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ token: 'tok123' }),
    },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  const planGuard: any = {
    assertCanWrite: jest.fn().mockResolvedValue(undefined),
    checkClientApprovalAccess: planError ? jest.fn().mockRejectedValue(planError) : jest.fn().mockResolvedValue(undefined),
  };
  return { svc: new MobilePostsService(prisma, planGuard, {} as any), prisma, planGuard };
}

describe('MobilePostsService.reviewLink', () => {
  beforeAll(() => {
    process.env.FRONTEND_URL = 'https://app.example.test/';
  });

  it('makes a pending review link for a draft and leaves the post alone', async () => {
    const { svc, prisma } = build();
    const r = await svc.reviewLink('p1', 'u1', SEEN);
    expect(r).toEqual({ url: 'https://app.example.test/approve/tok123', status: 'PENDING' });
    expect(prisma.postApproval.create).toHaveBeenCalledWith({
      data: { postId: 'p1', workspaceId: 'w1', clientEmail: '', clientName: 'Reviewer', status: 'PENDING' },
      select: { token: true },
    });
    expect(prisma.post.update).not.toHaveBeenCalled();
    expect(prisma.post.updateMany).not.toHaveBeenCalled();
  });

  it('reuses the link that is still waiting for a reply', async () => {
    const { svc, prisma } = build(basePost(), 'OWNER', { token: 'old-token', status: 'PENDING' });
    const r = await svc.reviewLink('p1', 'u1', SEEN);
    expect(r.url).toBe('https://app.example.test/approve/old-token');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replaces a link that was already answered', async () => {
    const { svc, prisma } = build(basePost(), 'OWNER', { token: 'old-token', status: 'REVISION_REQUESTED' });
    const r = await svc.reviewLink('p1', 'u1', SEEN);
    expect(r.url).toBe('https://app.example.test/approve/tok123');
    expect(prisma.postApproval.deleteMany).toHaveBeenCalledWith({ where: { postId: 'p1' } });
  });

  it('only shares drafts', async () => {
    for (const status of ['SCHEDULED', 'PENDING_APPROVAL', 'PUBLISHED', 'FAILED']) {
      const { svc, prisma } = build(basePost({ status }));
      await expect(svc.reviewLink('p1', 'u1', SEEN)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.postApproval.create).not.toHaveBeenCalled();
    }
  });

  it('keeps viewers out, answers 409 on a stale post, and passes the plan gate error through', async () => {
    const viewer = build(basePost(), 'VIEWER');
    await expect(viewer.svc.reviewLink('p1', 'u1', SEEN)).rejects.toBeInstanceOf(ForbiddenException);

    const stale = build();
    await expect(stale.svc.reviewLink('p1', 'u1', new Date('2026-11-20T09:00:00.000Z').toISOString())).rejects.toBeInstanceOf(ConflictException);

    const gated = build(basePost(), 'OWNER', null, new ForbiddenException('Upgrade to share posts for review.'));
    await expect(gated.svc.reviewLink('p1', 'u1', SEEN)).rejects.toBeInstanceOf(ForbiddenException);
    expect(gated.prisma.postApproval.create).not.toHaveBeenCalled();
  });
});
