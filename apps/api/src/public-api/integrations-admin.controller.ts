import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';
import { ManagerRoleGuard } from '../common/role.guards';
import { ApiKeysService } from './api-keys.service';
import { LeadCaptureService } from './lead-capture.service';

// Management screens for Settings > Integrations. Owners and admins only.

@Controller('api-keys')
@UseGuards(JwtGuard, WorkspaceMemberGuard, ManagerRoleGuard)
export class ApiKeysController {
  constructor(private keys: ApiKeysService) {}

  @Get(':workspaceId')
  list(@Param('workspaceId') workspaceId: string) {
    return this.keys.list(workspaceId);
  }

  @Post(':workspaceId')
  create(@Param('workspaceId') workspaceId: string, @Body() body: any, @Req() req: any) {
    return this.keys.create(workspaceId, req.user?.sub, body);
  }

  @Delete(':workspaceId/:id')
  revoke(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.keys.revoke(workspaceId, id);
  }
}

@Controller('lead-capture')
@UseGuards(JwtGuard, WorkspaceMemberGuard, ManagerRoleGuard)
export class LeadCaptureAdminController {
  constructor(private leads: LeadCaptureService) {}

  @Get(':workspaceId')
  list(@Param('workspaceId') workspaceId: string) {
    return this.leads.list(workspaceId);
  }

  @Post(':workspaceId')
  create(@Param('workspaceId') workspaceId: string, @Body() body: any) {
    return this.leads.create(workspaceId, body);
  }

  @Patch(':workspaceId/:id')
  update(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() body: any) {
    return this.leads.update(workspaceId, id, body);
  }

  @Post(':workspaceId/:id/rotate')
  rotate(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.leads.rotate(workspaceId, id);
  }

  @Delete(':workspaceId/:id')
  remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.leads.remove(workspaceId, id);
  }
}
