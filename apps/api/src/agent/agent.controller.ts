import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AgentService } from './agent.service';
import { BrandBrainService } from './brand-brain.service';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';
import { ManagerRoleGuard, WriterRoleGuard } from '../common/role.guards';

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
  constructor(
    private agentService: AgentService,
    private brandBrain: BrandBrainService,
  ) {}

  @Post(':workspaceId/campaigns')
  @UseGuards(WriterRoleGuard)
  createCampaign(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { goal: string; brief: string; platforms: string[]; clientId?: string; autoRunEnabled?: boolean; autoRunCadence?: string },
  ) {
    return this.agentService.createCampaign(workspaceId, body);
  }

  @Get(':workspaceId/campaigns')
  listCampaigns(@Param('workspaceId') workspaceId: string) {
    return this.agentService.listCampaigns(workspaceId);
  }

  // Autopilot — turn a campaign's scheduled auto-run on/off + set cadence.
  @Patch(':workspaceId/campaigns/:campaignId/schedule')
  @UseGuards(WriterRoleGuard)
  setSchedule(
    @Param('workspaceId') workspaceId: string,
    @Param('campaignId') campaignId: string,
    @Body() body: { autoRunEnabled: boolean; autoRunCadence?: string },
  ) {
    return this.agentService.setCampaignSchedule(workspaceId, campaignId, body);
  }

  @Post(':workspaceId/enable')
  @UseGuards(ManagerRoleGuard)
  enable(@Param('workspaceId') workspaceId: string) {
    return this.agentService.enable(workspaceId);
  }

  @Post(':workspaceId/pause')
  @UseGuards(WriterRoleGuard)
  pause(@Param('workspaceId') workspaceId: string) {
    return this.agentService.pause(workspaceId);
  }

  @Post(':workspaceId/resume')
  @UseGuards(ManagerRoleGuard)
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
  @UseGuards(WriterRoleGuard)
  runCampaignCycle(
    @Param('workspaceId') workspaceId: string,
    @Param('campaignId') campaignId: string,
    @Body() body: { trigger?: string },
  ) {
    return this.agentService.runCampaignCycle(workspaceId, campaignId, body?.trigger || 'manual');
  }

  // Approval loop — human promotes (or rejects) an agent-proposed draft.
  @Post(':workspaceId/tasks/:taskId/approve')
  @UseGuards(WriterRoleGuard)
  approveTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() body: { scheduledAt?: string; content?: string; mediaUrls?: string[] },
  ) {
    return this.agentService.approveTask(workspaceId, taskId, body || {});
  }

  @Post(':workspaceId/tasks/:taskId/reject')
  @UseGuards(WriterRoleGuard)
  rejectTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.agentService.rejectTask(workspaceId, taskId);
  }

  // ── Brand Brain (workspace memory the agent reads before drafting) ───────

  @Get(':workspaceId/memory')
  listMemory(@Param('workspaceId') workspaceId: string) {
    return this.brandBrain.listMemories(workspaceId);
  }

  @Post(':workspaceId/memory/seed')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @UseGuards(WriterRoleGuard)
  seedMemory(@Param('workspaceId') workspaceId: string) {
    return this.brandBrain.seedBrandBrain(workspaceId);
  }

  @Post(':workspaceId/memory')
  @UseGuards(WriterRoleGuard)
  addMemory(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { kind: string; content: string },
  ) {
    return this.brandBrain.addMemory(workspaceId, body?.kind, body?.content);
  }

  @Delete(':workspaceId/memory/:memoryId')
  @UseGuards(WriterRoleGuard)
  deleteMemory(
    @Param('workspaceId') workspaceId: string,
    @Param('memoryId') memoryId: string,
  ) {
    return this.brandBrain.deleteMemory(workspaceId, memoryId);
  }
}
