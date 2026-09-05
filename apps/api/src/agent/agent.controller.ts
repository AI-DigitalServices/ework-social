import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AgentService } from './agent.service';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';

/**
 * All routes are workspace-scoped and guarded the same way the rest of the
 * app's authenticated API is (JwtGuard + WorkspaceMemberGuard). The
 * enable/pause/resume endpoints are the human-facing kill switch described
 * in the AI OS Blueprint; run/status/runs are for testing and reviewing
 * shadow-mode cycles on staging before anything auto-triggers in Phase 2.
 */
@Controller('agent')
@UseGuards(JwtGuard, WorkspaceMemberGuard)
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Post(':workspaceId/campaigns')
  createCampaign(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { goal: string; brief: string; platforms: string[]; clientId?: string },
  ) {
    return this.agentService.createCampaign(workspaceId, body);
  }

  @Get(':workspaceId/campaigns')
  listCampaigns(@Param('workspaceId') workspaceId: string) {
    return this.agentService.listCampaigns(workspaceId);
  }

  @Post(':workspaceId/enable')
  enable(@Param('workspaceId') workspaceId: string) {
    return this.agentService.enable(workspaceId);
  }

  @Post(':workspaceId/pause')
  pause(@Param('workspaceId') workspaceId: string) {
    return this.agentService.pause(workspaceId);
  }

  @Post(':workspaceId/resume')
  resume(@Param('workspaceId') workspaceId: string) {
    return this.agentService.resume(workspaceId);
  }

  @Get(':workspaceId/status')
  status(@Param('workspaceId') workspaceId: string) {
    return this.agentService.getStatus(workspaceId);
  }

  @Get(':workspaceId/runs')
  runs(@Param('workspaceId') workspaceId: string, @Query('take') take?: string) {
    return this.agentService.listRuns(workspaceId, take ? parseInt(take, 10) : undefined);
  }

  @Post(':workspaceId/campaigns/:campaignId/run')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  runCampaignCycle(
    @Param('workspaceId') workspaceId: string,
    @Param('campaignId') campaignId: string,
    @Body() body: { trigger?: string },
  ) {
    return this.agentService.runCampaignCycle(workspaceId, campaignId, body?.trigger || 'manual');
  }

  // Approval loop — human promotes (or rejects) an agent-proposed draft.
  @Post(':workspaceId/tasks/:taskId/approve')
  approveTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() body: { scheduledAt?: string; content?: string; mediaUrls?: string[] },
  ) {
    return this.agentService.approveTask(workspaceId, taskId, body || {});
  }

  @Post(':workspaceId/tasks/:taskId/reject')
  rejectTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.agentService.rejectTask(workspaceId, taskId);
  }
}
