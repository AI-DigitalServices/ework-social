import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { planHasFeature, PlanFeatureKey } from './plan-features';

export const PLAN_FEATURE_KEY = 'plan_feature';

/** Decorator: @RequireFeature('crm_full') */
export const RequireFeature = (feature: PlanFeatureKey) =>
  SetMetadata(PLAN_FEATURE_KEY, feature);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PlanFeatureKey>(PLAN_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!feature) return true; // no gating required

    const request = context.switchToHttp().getRequest();
    const workspaceId: string =
      request.params?.workspaceId ||
      request.query?.workspaceId ||
      request.body?.workspaceId;

    if (!workspaceId) return true; // can't check without workspaceId — allow through

    const subscription = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });

    const plan = subscription?.plan ?? 'FREE';

    if (!planHasFeature(plan, feature)) {
      throw new ForbiddenException(
        `Your current plan (${plan}) does not include this feature. Please upgrade to access it.`,
      );
    }

    return true;
  }
}
