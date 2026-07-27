import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Enforces multi-tenant isolation.
 *
 * Whenever a request carries a `workspaceId` (query, body, or route param),
 * this guard confirms the authenticated JWT user is actually a member of that
 * workspace before the handler runs. If they are not, it throws Forbidden.
 *
 * Routes that legitimately carry no `workspaceId` — public OAuth callbacks,
 * client-approval token links, and record-by-id endpoints — pass through here
 * and are scoped at the service layer instead (see the *_scoped service helpers).
 *
 * The verified member role is attached to `req.workspaceRole` for any
 * downstream role-based checks.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();

    const workspaceId =
      req.query?.workspaceId || req.body?.workspaceId || req.params?.workspaceId;

    // No workspace context on this route — nothing to enforce here.
    // (record-by-id and token routes are scoped at the service layer)
    if (!workspaceId) return true;

    const userId = req.user?.sub;
    if (!userId) throw new ForbiddenException('Authentication required');

    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { role: true },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    req.workspaceRole = member.role;
    return true;
  }
}
