import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { WebhooksService, WEBHOOK_EVENTS } from './webhooks.service';
import { WEBHOOK_EVENT_CATALOG } from './webhook-events';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';
import { ManagerRoleGuard } from '../common/role.guards';

@Controller('webhooks')
@UseGuards(JwtGuard, WorkspaceMemberGuard)
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Get(':workspaceId/events')
  events() {
    return { events: WEBHOOK_EVENTS, catalog: WEBHOOK_EVENT_CATALOG };
  }

  @Get(':workspaceId')
  @UseGuards(ManagerRoleGuard)
  list(@Param('workspaceId') workspaceId: string) {
    return this.webhooks.list(workspaceId);
  }

  @Post(':workspaceId')
  @UseGuards(ManagerRoleGuard)
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { url: string; events: string[] },
  ) {
    return this.webhooks.create(workspaceId, body?.url, body?.events);
  }

  @Patch(':workspaceId/:id')
  @UseGuards(ManagerRoleGuard)
  setEnabled(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.webhooks.setEnabled(workspaceId, id, !!body?.enabled);
  }

  @Post(':workspaceId/:id/test')
  @UseGuards(ManagerRoleGuard)
  test(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.webhooks.sendTest(workspaceId, id);
  }

  @Get(':workspaceId/:id/deliveries')
  @UseGuards(ManagerRoleGuard)
  deliveries(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhooks.listDeliveries(workspaceId, id, limit);
  }

  @Post(':workspaceId/:id/deliveries/:deliveryId/resend')
  @UseGuards(ManagerRoleGuard)
  resend(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.webhooks.redeliver(workspaceId, id, deliveryId);
  }

  @Delete(':workspaceId/:id')
  @UseGuards(ManagerRoleGuard)
  remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.webhooks.remove(workspaceId, id);
  }
}
