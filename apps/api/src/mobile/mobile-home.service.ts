import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SNIPPET = 140;

function snippet(text: string | null | undefined): string {
  const t = (text || '').trim();
  return t.length > SNIPPET ? t.slice(0, SNIPPET - 1) + '…' : t;
}

/**
 * One call that fills the app's home screen for a workspace: counts, what is
 * scheduled next, recent failures, and who needs attention. Membership is
 * enforced by WorkspaceMemberGuard on the route; every query here is scoped
 * to that workspaceId. Social-account rows are read WITHOUT their tokens.
 */
@Injectable()
export class MobileHomeService {
  constructor(private prisma: PrismaService) {}

  async getHome(userId: string, workspaceId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const postSelect = {
      id: true,
      content: true,
      scheduledAt: true,
      errorMessage: true,
      updatedAt: true,
      mediaUrls: true,
      socialAccount: { select: { platform: true, accountName: true } },
    } as const;

    const [
      scheduled,
      drafts,
      failed,
      pendingApproval,
      publishedLast7Days,
      upcoming,
      recentFailures,
      awaitingClient,
      unreadInbox,
      accounts,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.post.count({ where: { workspaceId, status: 'SCHEDULED' } }),
      this.prisma.post.count({ where: { workspaceId, status: 'DRAFT' } }),
      this.prisma.post.count({ where: { workspaceId, status: 'FAILED' } }),
      this.prisma.post.count({ where: { workspaceId, status: 'PENDING_APPROVAL' } }),
      this.prisma.post.count({ where: { workspaceId, status: 'PUBLISHED', publishedAt: { gte: weekAgo } } }),
      this.prisma.post.findMany({
        where: { workspaceId, status: 'SCHEDULED', scheduledAt: { gte: now } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: postSelect,
      }),
      this.prisma.post.findMany({
        where: { workspaceId, status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: postSelect,
      }),
      this.prisma.postApproval.count({ where: { workspaceId, status: 'PENDING' } }),
      this.prisma.inboxMessage.count({ where: { workspaceId, isRead: false, isResolved: false } }),
      this.prisma.socialAccount.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true, platform: true, accountName: true },
      }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    const shape = (p: any) => ({
      id: p.id,
      content: snippet(p.content),
      scheduledAt: p.scheduledAt,
      updatedAt: p.updatedAt,
      errorMessage: p.errorMessage ?? null,
      mediaCount: Array.isArray(p.mediaUrls) ? p.mediaUrls.length : 0,
      thumbUrl:
        Array.isArray(p.mediaUrls) && typeof p.mediaUrls[0] === 'string' && !/\.(mp4|mov|webm)$/i.test(p.mediaUrls[0])
          ? p.mediaUrls[0]
          : null,
      mediaKind:
        Array.isArray(p.mediaUrls) && typeof p.mediaUrls[0] === 'string'
          ? /\.(mp4|mov|webm)$/i.test(p.mediaUrls[0])
            ? 'VIDEO'
            : 'PHOTO'
          : null,
      platform: p.socialAccount?.platform ?? null,
      accountName: p.socialAccount?.accountName ?? null,
    });

    return {
      workspaceId,
      generatedAt: now,
      posts: { scheduled, drafts, failed, pendingApproval, publishedLast7Days },
      needsAttention: {
        failedPosts: failed,
        awaitingClientApproval: awaitingClient,
        unreadInbox,
        unreadNotifications,
      },
      upcoming: upcoming.map(shape),
      recentFailures: recentFailures.map(shape),
      accounts: accounts.map((a) => ({ id: a.id, platform: a.platform, accountName: a.accountName })),
    };
  }
}
