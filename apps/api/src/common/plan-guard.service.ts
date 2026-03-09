import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPlanLimits } from './plan-limits';

@Injectable()
export class PlanGuardService {
  constructor(private prisma: PrismaService) {}

  async getWorkspacePlan(workspaceId: string): Promise<string> {
    const sub = await this.prisma.subscription.findFirst({ where: { workspaceId } });
    return sub?.plan || 'FREE';
  }

  async checkPostLimit(workspaceId: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const count = await this.prisma.post.count({
      where: { workspaceId, createdAt: { gte: startOfMonth } },
    });
    if (count >= limits.maxPostsPerMonth) {
      throw new ForbiddenException(
        `Your ${plan} plan allows ${limits.maxPostsPerMonth} posts/month. Upgrade for more.`
      );
    }
  }

  async checkSocialAccountLimit(workspaceId: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.socialAccount.count({ where: { workspaceId, isActive: true } });
    if (count >= limits.maxSocialAccounts) {
      throw new ForbiddenException(
        `Your ${plan} plan allows ${limits.maxSocialAccounts} social accounts. Upgrade to add more.`
      );
    }
  }

  async checkTeamMemberLimit(workspaceId: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.workspaceMember.count({ where: { workspaceId } });
    if (count >= limits.maxTeamMembers) {
      throw new ForbiddenException(
        `Your ${plan} plan allows ${limits.maxTeamMembers} team member(s). Upgrade to add more.`
      );
    }
  }

  async checkClientLimit(workspaceId: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.client.count({ where: { workspaceId } });
    if (count >= limits.maxClients) {
      throw new ForbiddenException(
        `Your ${plan} plan allows ${limits.maxClients} clients. Upgrade to add more.`
      );
    }
  }

  async checkFeatureAccess(workspaceId: string, feature: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const featureMap: Record<string, boolean> = {
      bulkScheduling: limits.bulkSchedulingEnabled,
      perPlatformEditor: limits.perPlatformEditorEnabled,
      whiteLabel: limits.whiteLabelEnabled,
      apiAccess: limits.apiAccessEnabled,
      twitter: limits.twitterEnabled,
    };
    if (!featureMap[feature]) {
      throw new ForbiddenException(
        `This feature is not available on your ${plan} plan. Please upgrade.`
      );
    }
  }

  async getWorkspaceLimits(workspaceId: string) {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [socialAccounts, postsThisMonth, teamMembers, clients] = await Promise.all([
      this.prisma.socialAccount.count({ where: { workspaceId, isActive: true } }),
      this.prisma.post.count({ where: { workspaceId, createdAt: { gte: startOfMonth } } }),
      this.prisma.workspaceMember.count({ where: { workspaceId } }),
      this.prisma.client.count({ where: { workspaceId } }),
    ]);
    return {
      plan,
      limits,
      usage: { socialAccounts, postsThisMonth, teamMembers, clients },
      percentages: {
        socialAccounts: Math.round((socialAccounts / limits.maxSocialAccounts) * 100),
        posts: Math.round((postsThisMonth / limits.maxPostsPerMonth) * 100),
        teamMembers: Math.round((teamMembers / limits.maxTeamMembers) * 100),
        clients: limits.maxClients === 999999 ? 0 : Math.round((clients / limits.maxClients) * 100),
      },
    };
  }
}
