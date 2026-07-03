import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('inbox')
@UseGuards(JwtGuard)
export class InboxController {
  constructor(private inboxService: InboxService) {}

  @Get()
  getMessages(
    @Query('workspaceId') workspaceId: string,
    @Query('platform') platform?: string,
    @Query('type') type?: string,
    @Query('isResolved') isResolved?: string,
    @Query('isRead') isRead?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inboxService.getMessages(workspaceId, {
      platform,
      type,
      isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
    });
  }

  @Get('stats')
  getStats(@Query('workspaceId') workspaceId: string) {
    return this.inboxService.getStats(workspaceId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.inboxService.markRead(id, workspaceId);
  }

  @Patch(':id/resolve')
  markResolved(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.inboxService.markResolved(id, workspaceId);
  }

  @Post(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() body: { workspaceId: string; content: string },
    @Request() req: any,
  ) {
    return this.inboxService.reply(id, body.workspaceId, body.content, req.user.sub);
  }

  @Post(':id/suggest')
  suggestReply(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.inboxService.suggestReply(id, workspaceId);
  }
}
