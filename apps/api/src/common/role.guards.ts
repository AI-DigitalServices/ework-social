import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { assertManagerRole, assertWriterRole, writeChecksEnabled } from './roles';

/**
 * Role guards. They read the role that WorkspaceMemberGuard verified for the
 * request's workspaceId (req.workspaceRole), so they must be listed AFTER it:
 *
 *   @UseGuards(JwtGuard, WorkspaceMemberGuard, ManagerRoleGuard)
 *
 * They fail CLOSED: if no role was resolved (the route carried no workspaceId),
 * access is refused. Both honour the WRITE_CHECKS=off kill switch.
 */

/** Owner or admin: members, billing, settings, keys, connected accounts. */
@Injectable()
export class ManagerRoleGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (req.method === 'OPTIONS') return true;
    if (!writeChecksEnabled()) return true;
    assertManagerRole(req.workspaceRole);
    return true;
  }
}

/** Owner, admin or editor: creating and changing content. */
@Injectable()
export class WriterRoleGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (req.method === 'OPTIONS') return true;
    if (!writeChecksEnabled()) return true;
    assertWriterRole(req.workspaceRole);
    return true;
  }
}
