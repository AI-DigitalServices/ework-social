import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { WebhooksService, WEBHOOK_EVENTS } from './webhooks.service';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';

@Controller('webhooks')
@UseGuards(JwtGuard, WorkspaceMemberGuard)
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Get(':workspaceId/events')
  events() {
    return { events: WEBHOOK_EVENTS };
  }

  @Get(':workspaceId')
  list(@Param('workspaceId') workspaceId: string) {
    return this.webhooks.list(workspaceId);
  }

  @Post(':workspaceId')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { url: string; events: string[] },
  ) {
    return this.webhooks.create(workspaceId, body?.url, body?.events);
  }

  @Patch(':workspaceId/:id')
  setEnabled(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.webhooks.setEnabled(workspaceId, id, !!body?.enabled);
  }

  @Post(':workspaceId/:id/test')
  test(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.webhooks.sendTest(workspaceId, id);
  }

  @Delete(':workspaceId/:id')
  remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.webhooks.remove(workspaceId, id);
  }
}
