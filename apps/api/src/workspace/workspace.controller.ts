import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('workspace')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post('invite')
  @UseGuards(JwtGuard)
  inviteMember(@Body() body: { workspaceId: string; email: string; role: string }, @Req() req: any) {
    return this.workspaceService.inviteMember(body.workspaceId, body.email, body.role, req.user.sub);
  }

  @Get(':workspaceId/members')
  @UseGuards(JwtGuard)
  getMembers(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getMembers(workspaceId);
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(JwtGuard)
  removeMember(@Param('workspaceId') workspaceId: string, @Param('userId') userId: string, @Req() req: any) {
    return this.workspaceService.removeMember(workspaceId, userId, req.user.sub);
  }

  @Post('invite/accept')
  acceptInvite(@Body() body: { token: string }) {
    return this.workspaceService.acceptInvite(body.token);
  }
}
