import { MobileHomeService } from './mobile-home.service';

function build() {
  const prisma: any = {
    post: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'p1',
          content: 'x'.repeat(300),
          scheduledAt: new Date('2026-11-18T09:00:00Z'),
          updatedAt: new Date(),
          errorMessage: null,
          mediaUrls: ['a', 'b'],
          socialAccount: { platform: 'LINKEDIN', accountName: 'Jben' },
        },
      ]),
    },
    postApproval: { count: jest.fn().mockResolvedValue(3) },
    inboxMessage: { count: jest.fn().mockResolvedValue(5) },
    socialAccount: { findMany: jest.fn().mockResolvedValue([{ id: 's1', platform: 'LINKEDIN', accountName: 'Jben' }]) },
    notification: { count: jest.fn().mockResolvedValue(4) },
  };
  return { prisma, svc: new MobileHomeService(prisma) };
}

describe('MobileHomeService.getHome', () => {
  it('assembles counts, attention items and upcoming posts for the workspace', async () => {
    const { svc } = build();
    const home = await svc.getHome('u1', 'w1');
    expect(home.workspaceId).toBe('w1');
    expect(home.posts).toEqual({ scheduled: 2, drafts: 2, failed: 2, pendingApproval: 2, publishedLast7Days: 2 });
    expect(home.needsAttention).toEqual({ failedPosts: 2, awaitingClientApproval: 3, unreadInbox: 5, unreadNotifications: 4 });
    expect(home.upcoming[0]).toMatchObject({ id: 'p1', mediaCount: 2, platform: 'LINKEDIN', accountName: 'Jben' });
    expect(home.upcoming[0].content.length).toBeLessThanOrEqual(140);
  });

  it('scopes every query to the workspace', async () => {
    const { svc, prisma } = build();
    await svc.getHome('u1', 'w1');
    for (const call of prisma.post.count.mock.calls) expect(call[0].where.workspaceId).toBe('w1');
    for (const call of prisma.post.findMany.mock.calls) expect(call[0].where.workspaceId).toBe('w1');
    expect(prisma.postApproval.count.mock.calls[0][0].where.workspaceId).toBe('w1');
    expect(prisma.inboxMessage.count.mock.calls[0][0].where.workspaceId).toBe('w1');
    expect(prisma.socialAccount.findMany.mock.calls[0][0].where.workspaceId).toBe('w1');
  });

  it('never reads social account tokens', async () => {
    const { svc, prisma } = build();
    await svc.getHome('u1', 'w1');
    const select = prisma.socialAccount.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('accessToken');
    expect(select).not.toHaveProperty('refreshToken');
    expect(Object.keys(select).sort()).toEqual(['accountName', 'id', 'platform']);
  });
});
