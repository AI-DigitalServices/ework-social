import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import {
  getAgentActionLimit,
  getAutopilotCadences,
  getPlanDisplayName,
  getPlanLimits,
} from '../common/plan-limits';

/**
 * GET /mobile/v1/app/config - everything the app needs after sign-in, in one
 * call: who the user is, every workspace they belong to (with their role), and
 * what each workspace's CURRENT plan allows, so the app hides what a plan does
 * not include instead of guessing. Trial-aware (uses the effective plan).
 */
@Injectable()
export class MobileConfigService {
  private readonly logger = new Logger(MobileConfigService.name);

  constructor(
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
    private config: ConfigService,
  ) {}

  async getConfig(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isVerified: true, avatar: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const wsSelect = { id: true, name: true, slug: true, logo: true } as const;
    const [memberships, owned] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { userId },
        include: { workspace: { select: wsSelect } },
      }),
      this.prisma.workspace.findMany({ where: { ownerId: userId }, select: wsSelect }),
    ]);

    // Legacy owners may have no membership row - include their workspaces as OWNER.
    const ownedIds = new Set(owned.map((w) => w.id));
    const byId = new Map<string, { ws: any; role: string }>();
    for (const m of memberships) byId.set(m.workspace.id, { ws: m.workspace, role: String(m.role) });
    for (const w of owned) if (!byId.has(w.id)) byId.set(w.id, { ws: w, role: 'OWNER' });

    const workspaces = await Promise.all(
      [...byId.values()].map(async ({ ws, role }) => ({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        logo: ws.logo ?? null,
        role,
        isOwner: ownedIds.has(ws.id),
        entitlements: await this.entitlements(ws.id),
      })),
    );

    return {
      apiVersion: 1,
      minSupportedAppVersion: this.config.get<string>('MOBILE_MIN_APP_VERSION') || '0.0.0',
      user,
      workspaces,
      auth: { socialProviders: ['google'] },
      oauthReturnConfigured: !!this.config.get<string>('MOBILE_OAUTH_RETURN_URL'),
    };
  }

  private async entitlements(workspaceId: string) {
    try {
      const eff = await this.planGuard.getEffectivePlan(workspaceId);
      const limits = getPlanLimits(eff.plan);
      return {
        plan: eff.plan,
        planDisplay: getPlanDisplayName(eff.plan),
        isTrialing: eff.isTrialing,
        trialDaysLeft: eff.trialDaysLeft,
        canWrite: eff.canWrite,
        readOnlyReason: eff.reason,
        agent: {
          enabled: limits.agentActionsPerMonth > 0,
          monthlyRuns: getAgentActionLimit(eff.plan, eff.isTrialing),
          ownKeyAllowed: limits.byokEnabled && limits.agentActionsPerMonth > 0,
        },
        autopilotCadences: getAutopilotCadences(eff.plan),
        clientApproval: !!limits.clientApprovalEnabled,
      };
    } catch (err: any) {
      // One bad workspace must not break the whole config.
      this.logger.warn(`entitlements failed for ${workspaceId}: ${err?.message}`);
      return null;
    }
  }
}
