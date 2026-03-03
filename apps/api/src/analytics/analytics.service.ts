import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(workspaceId: string) {
    const [
      totalPosts,
      scheduledPosts,
      publishedPosts,
      totalClients,
      activeClients,
      openLeads,
      socialAccounts,
    ] = await Promise.all([
      this.prisma.post.count({ where: { workspaceId } }),
      this.prisma.post.count({ where: { workspaceId, status: 'SCHEDULED' } }),
      this.prisma.post.count({ where: { workspaceId, status: 'PUBLISHED' } }),
      this.prisma.client.count({ where: { workspaceId } }),
      this.prisma.client.count({ where: { workspaceId, stage: 'ACTIVE' } }),
      this.prisma.client.count({
        where: {
          workspaceId,
          stage: { in: ['LEAD', 'CONTACTED', 'PROPOSAL'] },
        },
      }),
      this.prisma.socialAccount.count({ where: { workspaceId } }),
    ]);

    return {
      totalPosts,
      scheduledPosts,
      publishedPosts,
      totalClients,
      activeClients,
      openLeads,
      socialAccounts,
    };
  }

  async getPostActivity(workspaceId: string) {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const posts = await this.prisma.post.findMany({
      where: {
        workspaceId,
        createdAt: { gte: last30Days },
      },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const grouped: Record<string, { date: string; posts: number; scheduled: number }> = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      grouped[key] = {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        posts: 0,
        scheduled: 0,
      };
    }

    posts.forEach(post => {
      const key = post.createdAt.toISOString().split('T')[0];
      if (grouped[key]) {
        grouped[key].posts++;
        if (post.status === 'SCHEDULED') grouped[key].scheduled++;
      }
    });

    return Object.values(grouped);
  }

  async getPipelineBreakdown(workspaceId: string) {
    const stages = ['LEAD', 'CONTACTED', 'PROPOSAL', 'ACTIVE', 'DORMANT'];
    return Promise.all(
      stages.map(async stage => ({
        stage,
        count: await this.prisma.client.count({
          where: { workspaceId, stage: stage as any },
        }),
      }))
    );
  }

  async getPlatformBreakdown(workspaceId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { posts: true } },
      },
    });

    return accounts.map(a => ({
      platform: a.platform,
      accountName: a.accountName,
      posts: a._count.posts,
    }));
  }

  async getRecentPosts(workspaceId: string) {
    return this.prisma.post.findMany({
      where: { workspaceId },
      include: { socialAccount: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }
}
