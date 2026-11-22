import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPlanLimits, getAgentActionLimit, getVideoLimit } from '../common/plan-limits';
import { PostHogService } from '../analytics/posthog.service';
import { PlanGuardService } from '../common/plan-guard.service';

/** AI writes included each month on a free trial ('Give us an idea'). After the trial the plan's caption allowance applies. */
export const IDEA_TRIAL_LIMIT = 30;

@Injectable()
export class AiUsageService {
  constructor(
    private prisma: PrismaService,
    private posthog: PostHogService,
    private planGuard: PlanGuardService,
  ) {}

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async checkAndIncrement(
    workspaceId: string,
    type: 'CAPTION' | 'HASHTAG' | 'REWRITE' | 'CRM_INSIGHT' | 'REPLY_SUGGEST' | 'AGENT_ACTION' | 'ASSET_UPLOAD' | 'IMAGE_GEN' | 'ONBOARDING_AI' | 'IDEA_POST' | 'VIDEO_UPLOAD',
  ): Promise<void> {
    const month = this.getCurrentMonth();

    // Get subscription + plan limits (trial-aware: agent runs are capped tighter on a trial)
    const { plan, isTrialing } = await this.planGuard.getEffectivePlan(workspaceId);
    const limits = getPlanLimits(plan);

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
        // aiReplyEnabled gates access; aiReplyPerMonth defines the monthly cap
        if (!limits.aiReplyEnabled) { limit = 0; } else { limit = limits.aiReplyPerMonth; }
        limitLabel = 'AI reply suggestion';
        break;
      case 'AGENT_ACTION':
        // AI OS Phase 1 — shadow-mode agent runs, gated by agentActionsPerMonth (0 below Growth)
        limit = getAgentActionLimit(plan, isTrialing);
        limitLabel = 'AI agent action';
        break;
      case 'ASSET_UPLOAD':
        // Creative Hub — covers the vision tagging + embedding cost of one asset upload
        limit = limits.assetUploadsPerMonth;
        limitLabel = 'Creative Hub asset upload';
        break;
      case 'ONBOARDING_AI':
        // Mobile onboarding: reading a business website to propose a profile. Open to every
        // plan (including the trial) with a small fixed cap, so a new owner can always set up.
        limit = 6;
        limitLabel = 'AI business setup';
        break;
      case 'IDEA_POST':
        // Mobile "Give us an idea": generous on the free trial so a new owner can feel the product,
        // then the plan's caption allowance.
        limit = isTrialing ? IDEA_TRIAL_LIMIT : limits.aiCaptionsPerMonth;
        limitLabel = 'AI post idea';
        break;
      case 'VIDEO_UPLOAD':
        // Short videos from the app: storage and bandwidth cost, so each plan has its own monthly allowance.
        limit = getVideoLimit(plan, isTrialing);
        limitLabel = 'video';
        break;
      case 'IMAGE_GEN':
        // AI OS Phase 2 — generative creative, premium only (0 below Growth)
        limit = limits.aiImageGenPerMonth;
        limitLabel = 'AI image generation';
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

  /** How many "Give us an idea" writes this workspace has used and has left this month (regenerating counts). */
  async getIdeaUsage(workspaceId: string) {
    const month = this.getCurrentMonth();
    const [row, eff] = await Promise.all([
      this.prisma.aiUsage.findUnique({ where: { workspaceId_type_month: { workspaceId, type: 'IDEA_POST', month } } }),
      this.planGuard.getEffectivePlan(workspaceId),
    ]);
    const limit = eff.isTrialing ? IDEA_TRIAL_LIMIT : getPlanLimits(eff.plan).aiCaptionsPerMonth;
    const used = row?.count ?? 0;
    const now = new Date();
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      trial: !!eff.isTrialing,
      resets: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
    };
  }

  /** How many videos this workspace has posted from the app this month and how many it may. */
  async getVideoUsage(workspaceId: string) {
    const month = this.getCurrentMonth();
    const [row, eff] = await Promise.all([
      this.prisma.aiUsage.findUnique({ where: { workspaceId_type_month: { workspaceId, type: 'VIDEO_UPLOAD', month } } }),
      this.planGuard.getEffectivePlan(workspaceId),
    ]);
    const limit = getVideoLimit(eff.plan, !!eff.isTrialing);
    const used = row?.count ?? 0;
    const now = new Date();
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      trial: !!eff.isTrialing,
      resets: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
    };
  }

  async getUsage(workspaceId: string) {
    const month = this.getCurrentMonth();
    const usage = await this.prisma.aiUsage.findMany({
      where: { workspaceId, month },
    });

    const { plan, isTrialing } = await this.planGuard.getEffectivePlan(workspaceId);
    const limits = getPlanLimits(plan);

    return {
      month,
      usage: {
        CAPTION:      { used: usage.find(u => u.type === 'CAPTION')?.count      || 0, limit: limits.aiCaptionsPerMonth },
        HASHTAG:      { used: usage.find(u => u.type === 'HASHTAG')?.count      || 0, limit: limits.aiHashtagsEnabled ? 'unlimited' : 0 },
        REWRITE:      { used: usage.find(u => u.type === 'REWRITE')?.count      || 0, limit: limits.aiRewriteEnabled ? 'unlimited' : 0 },
        CRM_INSIGHT:  { used: usage.find(u => u.type === 'CRM_INSIGHT')?.count  || 0, limit: limits.aiCrmInsightsEnabled ? 'unlimited' : 0 },
        REPLY_SUGGEST:{ used: usage.find(u => u.type === 'REPLY_SUGGEST')?.count || 0, limit: limits.aiReplyEnabled ? limits.aiReplyPerMonth : 0 },
        AGENT_ACTION: { used: usage.find(u => u.type === 'AGENT_ACTION')?.count || 0, limit: getAgentActionLimit(plan, isTrialing) },
        ASSET_UPLOAD: { used: usage.find(u => u.type === 'ASSET_UPLOAD')?.count || 0, limit: limits.assetUploadsPerMonth },
        IMAGE_GEN:    { used: usage.find(u => u.type === 'IMAGE_GEN')?.count    || 0, limit: limits.aiImageGenPerMonth },
      },
    };
  }
}
