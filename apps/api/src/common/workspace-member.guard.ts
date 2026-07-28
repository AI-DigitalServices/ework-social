import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
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
  private readonly logger = new Logger(WorkspaceMemberGuard.name);

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

    if (member) {
      req.workspaceRole = member.role;
      return true;
    }

    // Safety net: the workspace OWNER always has access, even if no
    // WorkspaceMember row exists. Legacy workspaces created before membership
    // rows were written would otherwise lock their own owner out of every
    // workspace-scoped page (Scheduler, Inbox, CRM, Responder).
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (workspace?.ownerId === userId) {
      // Self-heal the missing membership row so this lookup isn't needed again.
      try {
        await this.prisma.workspaceMember.create({
          data: { workspaceId, userId, role: 'OWNER' as any },
        });
        this.logger.warn(`Backfilled missing OWNER membership for workspace ${workspaceId}`);
      } catch {
        // race or constraint — access is still granted below
      }
      req.workspaceRole = 'OWNER';
      return true;
    }

    this.logger.warn(
      `Access denied: user ${userId} is not a member or owner of workspace ${workspaceId}`,
    );
    throw new ForbiddenException('You do not have access to this workspace');
  }
}
