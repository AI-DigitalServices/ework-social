import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPlanLimits } from '../common/plan-limits';
import { PostHogService } from '../analytics/posthog.service';

@Injectable()
export class AiUsageService {
  constructor(private prisma: PrismaService, private posthog: PostHogService) {}

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async checkAndIncrement(
    workspaceId: string,
    type: 'CAPTION' | 'HASHTAG' | 'REWRITE' | 'CRM_INSIGHT' | 'REPLY_SUGGEST',
  ): Promise<void> {
    const month = this.getCurrentMonth();

    // Get subscription + plan limits
    const subscription = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });
    const limits = getPlanLimits(subscription?.plan || 'FREE');

    // Check limit based on type
    let limit = 0;
    let limitLabel = '';
    switch (type) {
      case 'CAPTION':
        limit = limits.aiCaptionsPerMonth;
        limitLabel = 'AI caption';
        break;
      case 'HASHTAG':
        limit = limits.aiHashtagsEnabled ? 999999 : 0;
        limitLabel = 'AI hashtag';
        break;
      case 'REWRITE':
        limit = limits.aiRewriteEnabled ? 999999 : 0;
        limitLabel = 'AI rewrite';
        break;
      case 'CRM_INSIGHT':
        limit = limits.aiCrmInsightsEnabled ? 999999 : 0;
        limitLabel = 'AI CRM insight';
        break;
      case 'REPLY_SUGGEST':
        limit = (limits as any).aiReplyPerMonth || 0;
        limitLabel = 'AI reply suggestion';
        break;
    }

    if (limit === 0) {
      this.posthog.capture(workspaceId, 'ai_feature_blocked_by_plan', { type });
      throw new ForbiddenException(
        `${limitLabel} is not available on your current plan. Please upgrade.`
      );
    }

    if (limit < 999999) {
      // Check current usage
      const usage = await this.prisma.aiUsage.findUnique({
        where: { workspaceId_type_month: { workspaceId, type, month } },
      });

      if (usage && usage.count >= limit) {
        this.posthog.capture(workspaceId, 'ai_usage_limit_reached', { type, limit });
        throw new ForbiddenException(
          `You have reached your ${limitLabel} limit of ${limit} for this month. Upgrade your plan for more.`
        );
      }
    }

    // Increment usage
    await this.prisma.aiUsage.upsert({
      where: { workspaceId_type_month: { workspaceId, type, month } },
      update: { count: { increment: 1 } },
      create: { workspaceId, type, month, count: 1 },
    });

    this.posthog.capture(workspaceId, 'ai_feature_used', { type });
  }

  async getUsage(workspaceId: string) {
    const month = this.getCurrentMonth();
    const usage = await this.prisma.aiUsage.findMany({
      where: { workspaceId, month },
    });

    const subscription = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });
    const limits = getPlanLimits(subscription?.plan || 'FREE');

    return {
      month,
      usage: {
        CAPTION:      { used: usage.find(u => u.type === 'CAPTION')?.count      || 0, limit: limits.aiCaptionsPerMonth },
        HASHTAG:      { used: usage.find(u => u.type === 'HASHTAG')?.count      || 0, limit: limits.aiHashtagsEnabled ? 'unlimited' : 0 },
        REWRITE:      { used: usage.find(u => u.type === 'REWRITE')?.count      || 0, limit: limits.aiRewriteEnabled ? 'unlimited' : 0 },
        CRM_INSIGHT:  { used: usage.find(u => u.type === 'CRM_INSIGHT')?.count  || 0, limit: limits.aiCrmInsightsEnabled ? 'unlimited' : 0 },
        REPLY_SUGGEST:{ used: usage.find(u => u.type === 'REPLY_SUGGEST')?.count|| 0, limit: (limits as any).aiReplyPerMonth || 0 },
      },
    };
  }
}
