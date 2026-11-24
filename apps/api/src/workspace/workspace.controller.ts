import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';

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

  @Patch(':workspaceId')
  @UseGuards(JwtGuard)
  renameWorkspace(@Param('workspaceId') workspaceId: string, @Body() body: { name: string }, @Req() req: any) {
    if (!body.name?.trim()) throw new BadRequestException('Workspace name is required');
    return this.workspaceService.renameWorkspace(workspaceId, body.name.trim(), req.user.sub);
  }

  @Patch(':workspaceId/logo')
  @UseGuards(JwtGuard)
  setLogo(@Param('workspaceId') workspaceId: string, @Body() body: { logo?: string | null }, @Req() req: any) {
    const logo = body?.logo ? String(body.logo) : null;
    return this.workspaceService.setLogo(workspaceId, logo, req.user.sub);
  }

  @Delete(':workspaceId')
  @UseGuards(JwtGuard)
  deleteWorkspace(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    return this.workspaceService.deleteWorkspace(workspaceId, req.user.sub);
  }

  @Post('invite')
  @UseGuards(JwtGuard)
  inviteMember(@Body() body: { workspaceId: string; email: string; role: string }, @Req() req: any) {
    return this.workspaceService.inviteMember(body.workspaceId, body.email, body.role, req.user.sub);
  }

  @Get(':workspaceId/members')
  @UseGuards(JwtGuard, WorkspaceMemberGuard)
  getMembers(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    // req.workspaceRole is the role WorkspaceMemberGuard verified; invite tokens are
    // only shown to owners and admins.
    return this.workspaceService.getMembers(workspaceId, req.workspaceRole);
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
