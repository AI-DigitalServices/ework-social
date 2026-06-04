import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('workspace')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Get('my')
  @UseGuards(JwtGuard)
  listWorkspaces(@Req() req: any) {
    return this.workspaceService.listWorkspaces(req.user.sub);
  }

  @Post('create')
  @UseGuards(JwtGuard)
  createWorkspace(@Body() body: { name: string }, @Req() req: any) {
    if (!body.name?.trim()) throw new BadRequestException('Workspace name is required');
    return this.workspaceService.createWorkspace(req.user.sub, body.name.trim());
  }

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
