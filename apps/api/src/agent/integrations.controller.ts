import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';

/**
 * Workspace-scoped BYOK integrations. Same guards as the rest of the
 * authenticated API. The key itself is never returned by any route.
 */
@Controller('integrations')
@UseGuards(JwtGuard, WorkspaceMemberGuard)
export class IntegrationsController {
  constructor(private integrations: IntegrationsService) {}

  @Get(':workspaceId/ai')
  getStatus(@Param('workspaceId') workspaceId: string) {
    return this.integrations.getStatus(workspaceId);
  }

  @Post(':workspaceId/ai')
  connect(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { provider: string; apiKey: string },
  ) {
    return this.integrations.connect(workspaceId, body?.provider, body?.apiKey);
  }

  @Delete(':workspaceId/ai')
  disconnect(@Param('workspaceId') workspaceId: string) {
    return this.integrations.disconnect(workspaceId);
  }
}
