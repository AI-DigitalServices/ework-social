import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { LlmClientService } from './llm-client.service';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';

/**
 * Workspace-scoped BYOK integrations. Same guards as the rest of the
 * authenticated API. The key itself is never returned by any route.
 */
@Controller('integrations')
@UseGuards(JwtGuard, WorkspaceMemberGuard)
export class IntegrationsController {
  constructor(
    private integrations: IntegrationsService,
    private llm: LlmClientService,
  ) {}

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

  // ── The workspace's own Claude key for the AI Agent + Brand Brain ─────────

  @Get(':workspaceId/llm')
  getLlmStatus(@Param('workspaceId') workspaceId: string) {
    return this.llm.getStatus(workspaceId);
  }

  @Post(':workspaceId/llm')
  connectLlm(@Param('workspaceId') workspaceId: string, @Body() body: { apiKey: string }) {
    return this.llm.connect(workspaceId, body?.apiKey);
  }

  @Delete(':workspaceId/llm')
  disconnectLlm(@Param('workspaceId') workspaceId: string) {
    return this.llm.disconnect(workspaceId);
  }
}
