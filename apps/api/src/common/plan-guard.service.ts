import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPlanLimits, getPlanDisplayName, FEATURE_MIN_PLAN } from './plan-limits';

/**
 * The tier a 7-day trial grants. Growth is deliberate: it is the "Most Popular"
 * tier and the one the trial is meant to sell, so the trialist experiences
 * LinkedIn, client approvals, bulk scheduling, automation and real AI limits —
 * the things they are being asked to pay for. Trialling the FREE tier and then
 * asking for $12 does not convert, because they never saw the product.
 */
export const TRIAL_PLAN = 'GROWTH';

/** What a workspace can actually do right now, as opposed to what it has bought. */
export interface EffectivePlan {
  /** The plan whose limits apply this instant (trial tier while trialling). */
  plan: string;
  /** The plan actually on the subscription row — what they have paid for, if anything. */
  purchasedPlan: string;
  isTrialing: boolean;
  trialExpired: boolean;
  trialEndsAt: Date | null;
  trialDaysLeft: number;
  /** False = read-only. Reads still work; anything that creates or publishes does not. */
  canWrite: boolean;
  /** Machine-readable reason writes are blocked, for the frontend banner. */
  reason: 'OK' | 'TRIAL_EXPIRED' | 'SUBSCRIPTION_ENDED' | 'NO_SUBSCRIPTION';
}

@Injectable()
export class PlanGuardService {
  constructor(private prisma: PrismaService) {}

  // ── Entitlement resolution ───────────────────────────────────────────────

  /**
   * Single source of truth for "what is this workspace allowed to do right now".
   *
   * Separation of concerns worth preserving:
   *   subscription.plan  = what they have PURCHASED (FREE until they pay)
   *   effective plan     = what they may USE right now (TRIAL_PLAN while trialling)
   *
   * That is why signup still writes plan: 'FREE' — the trial is an entitlement,
   * not a purchase, and conflating the two is what makes billing state drift.
   *
   * Deliberately does not depend on a cron having run: expiry is computed from
   * trialEndsAt on every call, so a late or failed job cannot silently hand out
   * paid features.
   */
  async getEffectivePlan(workspaceId: string): Promise<EffectivePlan> {
    const sub = await this.prisma.subscription.findFirst({ where: { workspaceId } });
    const now = new Date();

    if (!sub) {
      return {
        plan: 'FREE',
        purchasedPlan: 'FREE',
        isTrialing: false,
        trialExpired: false,
        trialEndsAt: null,
        trialDaysLeft: 0,
        canWrite: false,
        reason: 'NO_SUBSCRIPTION',
      };
    }

    const base = {
      purchasedPlan: sub.plan,
      trialEndsAt: sub.trialEndsAt ?? null,
    };

    // ── Paid and current ──────────────────────────────────────────────────
    if (sub.status === 'ACTIVE' && sub.plan !== 'FREE') {
      return {
        ...base,
        plan: sub.plan,
        isTrialing: false,
        trialExpired: false,
        trialDaysLeft: 0,
        canWrite: true,
        reason: 'OK',
      };
    }

    // ── Payment retrying: keep them working ───────────────────────────────
    // PayPal suspends only after three consecutive failures, and Paystack
    // retries too. Locking an agency out because a card bounced on a Tuesday
    // costs more in goodwill than the grace period costs in service.
    if (sub.status === 'PAST_DUE' && sub.plan !== 'FREE') {
      return {
        ...base,
        plan: sub.plan,
        isTrialing: false,
        trialExpired: false,
        trialDaysLeft: 0,
        canWrite: true,
        reason: 'OK',
      };
    }

    // ── Cancelled but paid through the period ─────────────────────────────
    const periodEnd = (sub as any).currentPeriodEnd as Date | null | undefined;
    if (sub.status === 'CANCELLED' && sub.plan !== 'FREE' && periodEnd && periodEnd > now) {
      return {
        ...base,
        plan: sub.plan,
        isTrialing: false,
        trialExpired: false,
        trialDaysLeft: 0,
        canWrite: true,
        reason: 'OK',
      };
    }

    // ── Trial ─────────────────────────────────────────────────────────────
    if (sub.status === 'TRIALING' && sub.trialEndsAt) {
      const msLeft = sub.trialEndsAt.getTime() - now.getTime();
      if (msLeft > 0) {
        return {
          ...base,
          plan: TRIAL_PLAN,
          isTrialing: true,
          trialExpired: false,
          trialDaysLeft: Math.ceil(msLeft / (1000 * 60 * 60 * 24)),
          canWrite: true,
          reason: 'OK',
        };
      }
      // Trial ran out and they never converted → read-only.
      return {
        ...base,
        plan: 'FREE',
        isTrialing: false,
        trialExpired: true,
        trialDaysLeft: 0,
        canWrite: false,
        reason: 'TRIAL_EXPIRED',
      };
    }

    // ── Everything else: lapsed ───────────────────────────────────────────
    return {
      ...base,
      plan: 'FREE',
      isTrialing: false,
      trialExpired: false,
      trialDaysLeft: 0,
      canWrite: false,
      reason: sub.plan === 'FREE' ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_ENDED',
    };
  }

  /**
   * Kept for backwards compatibility — every existing call site now becomes
   * trial-aware for free, because this delegates to getEffectivePlan().
   */
  async getWorkspacePlan(workspaceId: string): Promise<string> {
    const { plan } = await this.getEffectivePlan(workspaceId);
    return plan;
  }

  /** Throws on any write attempt from a lapsed workspace. Reads are untouched. */
  async assertCanWrite(workspaceId: string): Promise<EffectivePlan> {
    const effective = await this.getEffectivePlan(workspaceId);
    if (!effective.canWrite) {
      throw new ForbiddenException(
        effective.reason === 'TRIAL_EXPIRED'
          ? 'Your free trial has ended. Choose a plan to keep publishing — your clients, posts and settings are all still here. /dashboard/settings?tab=plan'
          : 'Your subscription has ended. Reactivate a plan to keep publishing — nothing has been deleted. /dashboard/settings?tab=plan'
      );
    }
    return effective;
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
  // Each of these is on a write path, so each asserts write access first. A
  // read-only workspace gets the "your trial ended" message rather than a
  // confusing "you have reached your FREE plan limit of 3".

  async checkPostLimit(workspaceId: string): Promise<void> {
    const { plan } = await this.assertCanWrite(workspaceId);
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
    const { plan } = await this.assertCanWrite(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.socialAccount.count({ where: { workspaceId, isActive: true } });
    if (count >= limits.maxSocialAccounts) {
      throw new ForbiddenException(
        `Your ${getPlanDisplayName(plan)} plan allows ${limits.maxSocialAccounts} social accounts. Upgrade to add more.`
      );
    }
  }

  async checkTeamMemberLimit(workspaceId: string): Promise<void> {
    const { plan } = await this.assertCanWrite(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.workspaceMember.count({ where: { workspaceId } });
    if (count >= limits.maxTeamMembers) {
      throw new ForbiddenException(
        `Your ${getPlanDisplayName(plan)} plan allows ${limits.maxTeamMembers} team member(s). Upgrade to add more.`
      );
    }
  }

  async checkClientLimit(workspaceId: string): Promise<void> {
    const { plan } = await this.assertCanWrite(workspaceId);
    const limits = getPlanLimits(plan);
    const count = await this.prisma.client.count({ where: { workspaceId } });
    if (count >= limits.maxClients) {
      throw new ForbiddenException(
        `Your ${getPlanDisplayName(plan)} plan allows ${limits.maxClients} clients. Upgrade to add more.`
      );
    }
  }

  async checkAutoResponderRuleLimit(workspaceId: string): Promise<void> {
    const { plan } = await this.assertCanWrite(workspaceId);
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
  // Note: NOT write-gated. Feature checks also run on read paths (rendering a
  // tab, loading the pipeline), and a read-only workspace should still be able
  // to look at its own data. Writes are stopped by the limit checks above.

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
    const effective = await this.getEffectivePlan(workspaceId);
    const plan = effective.plan;
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
      // Trial + entitlement state, so the dashboard can render the banner
      // without a second round trip.
      trial: {
        isTrialing: effective.isTrialing,
        trialDaysLeft: effective.trialDaysLeft,
        trialEndsAt: effective.trialEndsAt,
        expired: effective.trialExpired,
        canWrite: effective.canWrite,
        reason: effective.reason,
        purchasedPlan: effective.purchasedPlan,
      },
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
