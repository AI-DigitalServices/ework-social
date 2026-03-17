import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getKpiStats() {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
    const lastMonth = new Date(now); lastMonth.setMonth(now.getMonth() - 1); lastMonth.setDate(1); lastMonth.setHours(0,0,0,0);
    const endOfLastMonth = new Date(now); endOfLastMonth.setDate(0); endOfLastMonth.setHours(23,59,59,999);

    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      newUsersLastMonth,
      totalWorkspaces,
      totalPosts,
      postsThisMonth,
      publishedPosts,
      failedPosts,
      totalSocialAccounts,
      totalClients,
      subscriptions,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({ where: { createdAt: { gte: lastMonth, lte: endOfLastMonth } } }),
      this.prisma.workspace.count(),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.post.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.post.count({ where: { status: 'FAILED' } }),
      this.prisma.socialAccount.count({ where: { isActive: true } }),
      this.prisma.client.count(),
      this.prisma.subscription.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
      this.prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ownedWorkspaces: {
            include: { subscription: true },
            take: 1,
          },
        },
      }),
    ]);

    // Plan breakdown
    const planBreakdown = {
      FREE: 0, TRIAL: 0, STARTER: 0, GROWTH: 0, AGENCY_PRO: 0,
    };
    subscriptions.forEach((s: any) => {
      if (s.plan in planBreakdown) planBreakdown[s.plan as keyof typeof planBreakdown] = s._count.plan;
    });

    // MRR calculation
    const mrr = (planBreakdown.STARTER * 5) + (planBreakdown.GROWTH * 12) + (planBreakdown.AGENCY_PRO * 29);

    // User growth rate
    const growthRate = newUsersLastMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
      : 100;

    return {
      users: {
        total: totalUsers,
        today: newUsersToday,
        thisWeek: newUsersThisWeek,
        thisMonth: newUsersThisMonth,
        lastMonth: newUsersLastMonth,
        growthRate,
      },
      revenue: {
        mrr,
        arr: mrr * 12,
        planBreakdown,
        payingUsers: planBreakdown.STARTER + planBreakdown.GROWTH + planBreakdown.AGENCY_PRO,
      },
      product: {
        totalWorkspaces,
        totalPosts,
        postsThisMonth,
        publishedPosts,
        failedPosts,
        totalSocialAccounts,
        totalClients,
        publishSuccessRate: totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0,
      },
      recentUsers: recentUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        plan: u.ownedWorkspaces[0]?.subscription?.plan || 'FREE',
        joinedAt: u.createdAt,
        isVerified: u.isVerified,
      })),
    };
  }
}
