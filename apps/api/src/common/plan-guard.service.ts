import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPlanLimits, getPlanDisplayName, FEATURE_MIN_PLAN } from './plan-limits';

@Injectable()
export class PlanGuardService {
  constructor(private prisma: PrismaService) {}

  async getWorkspacePlan(workspaceId: string): Promise<string> {
    const sub = await this.prisma.subscription.findFirst({ where: { workspaceId } });
    return sub?.plan || 'FREE';
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private upgradeMessage(feature: string, plan: string): string {
    const minPlan = FEATURE_MIN_PLAN[feature];
    const minPlanName = minPlan ? getPlanDisplayName(minPlan) : 'a higher';
    return `This feature requires the ${minPlanName} plan or above. Upgrade at /dashboard/settings?tab=plan`;
  }

  private startOfMonth(): Date {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ── Quantity limits ──────────────────────────────────────────────────────

  async checkPostLimit(workspaceId: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.post.count({
      where: { workspaceId, createdAt: { gte: this.startOfMonth() } },
    });
    if (count >= limits.maxPostsPerMonth) {
      throw new ForbiddenException(
        `Your ${getPlanDisplayName(plan)} plan allows ${limits.maxPostsPerMonth} posts/month. Upgrade for more.`
      );
    }
  }

  async checkSocialAccountLimit(workspaceId: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.socialAccount.count({ where: { workspaceId, isActive: true } });
    if (count >= limits.maxSocialAccounts) {
      throw new ForbiddenException(
        `Your ${getPlanDisplayName(plan)} plan allows ${limits.maxSocialAccounts} social accounts. Upgrade to add more.`
      );
    }
  }

  async checkTeamMemberLimit(workspaceId: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.workspaceMember.count({ where: { workspaceId } });
    if (count >= limits.maxTeamMembers) {
      throw new ForbiddenException(
        `Your ${getPlanDisplayName(plan)} plan allows ${limits.maxTeamMembers} team member(s). Upgrade to add more.`
      );
    }
  }

  async checkClientLimit(workspaceId: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.client.count({ where: { workspaceId } });
    if (count >= limits.maxClients) {
      throw new ForbiddenException(
        `Your ${getPlanDisplayName(plan)} plan allows ${limits.maxClients} clients. Upgrade to add more.`
      );
    }
  }

  async checkAutoResponderRuleLimit(workspaceId: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);
    if (limits.maxAutoResponderRules === 0) {
      throw new ForbiddenException(
        `Auto-responder rules are not available on the ${getPlanDisplayName(plan)} plan. Upgrade to Starter or above.`
      );
    }
    const count = await this.prisma.autoResponderRule.count({ where: { workspaceId } });
    if (count >= limits.maxAutoResponderRules) {
      throw new ForbiddenException(
        `Your ${getPlanDisplayName(plan)} plan allows ${limits.maxAutoResponderRules} auto-responder rules. Upgrade to add more.`
      );
    }
  }

  // ── Feature flags ────────────────────────────────────────────────────────

  async checkFeatureAccess(workspaceId: string, feature: string): Promise<void> {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);

    const featureMap: Record<string, boolean> = {
      // Scheduling
      bulkScheduling:       limits.bulkSchedulingEnabled,
      perPlatformEditor:    limits.perPlatformEditorEnabled,
      // Platform
      twitter:              limits.twitterEnabled,
      // Inbox
      inboxTags:            limits.inboxTagsEnabled,
      inboxCrmLink:         limits.inboxCrmLinkEnabled,
      inboxAssign:          limits.inboxAssignEnabled,
      // AI
      aiReply:              limits.aiReplyEnabled,
      aiCrmInsights:        limits.aiCrmInsightsEnabled,
      // Collaboration
      clientApproval:       limits.clientApprovalEnabled,
      // CRM
      crmPipeline:          limits.crmPipelineEnabled,
      crmActivityLog:       limits.crmActivityLogEnabled,
      crmExport:            limits.crmExportEnabled,
      crmAssign:            limits.crmAssignEnabled,
      // Agency
      whiteLabel:           limits.whiteLabelEnabled,
      apiAccess:            limits.apiAccessEnabled,
    };

    if (featureMap[feature] === false) {
      throw new ForbiddenException(this.upgradeMessage(feature, plan));
    }
  }

  // ── Convenience single-call checks ──────────────────────────────────────

  async checkTwitterAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'twitter');
  }

  async checkInboxTagsAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'inboxTags');
  }

  async checkInboxCrmLinkAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'inboxCrmLink');
  }

  async checkInboxAssignAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'inboxAssign');
  }

  async checkClientApprovalAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'clientApproval');
  }

  // ── AI feature checks ────────────────────────────────────────────────────

  async checkAiReplyAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'aiReply');
  }

  // ── CRM feature checks ───────────────────────────────────────────────────

  async checkCrmPipelineAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'crmPipeline');
  }

  async checkCrmActivityLogAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'crmActivityLog');
  }

  async checkCrmExportAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'crmExport');
  }

  async checkCrmAssignAccess(workspaceId: string): Promise<void> {
    return this.checkFeatureAccess(workspaceId, 'crmAssign');
  }

  async checkCrmFullAccess(workspaceId: string): Promise<void> {
    // "crm full" = editing deal value, company, source, next follow-up — Growth+
    // Reuse crmActivityLog gate as the proxy for "full CRM editing access"
    return this.checkFeatureAccess(workspaceId, 'crmActivityLog');
  }

  // ── Full workspace usage summary ─────────────────────────────────────────

  async getWorkspaceLimits(workspaceId: string) {
    const plan = await this.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);

    const [socialAccounts, postsThisMonth, teamMembers, clients, autoResponderRules] =
      await Promise.all([
        this.prisma.socialAccount.count({ where: { workspaceId, isActive: true } }),
        this.prisma.post.count({ where: { workspaceId, createdAt: { gte: this.startOfMonth() } } }),
        this.prisma.workspaceMember.count({ where: { workspaceId } }),
        this.prisma.client.count({ where: { workspaceId } }),
        this.prisma.autoResponderRule.count({ where: { workspaceId } }),
      ]);

    return {
      plan,
      planDisplay: getPlanDisplayName(plan),
      limits,
      usage: { socialAccounts, postsThisMonth, teamMembers, clients, autoResponderRules },
      percentages: {
        socialAccounts:    Math.min(100, Math.round((socialAccounts / limits.maxSocialAccounts) * 100)),
        posts:             Math.min(100, Math.round((postsThisMonth / limits.maxPostsPerMonth) * 100)),
        teamMembers:       Math.min(100, Math.round((teamMembers / limits.maxTeamMembers) * 100)),
        clients:           limits.maxClients >= 999999 ? 0 : Math.min(100, Math.round((clients / limits.maxClients) * 100)),
        autoResponderRules: limits.maxAutoResponderRules >= 999999 ? 0 : Math.min(100, Math.round((autoResponderRules / limits.maxAutoResponderRules) * 100)),
      },
    };
  }
}
