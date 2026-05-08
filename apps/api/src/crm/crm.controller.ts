import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CrmService } from './crm.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AutomationService } from './automation.service';
import { JwtGuard } from '../auth/jwt.guard';
import { PlanGuard, RequireFeature } from '../common/plan.guard';

@Controller('crm')
@UseGuards(JwtGuard)
export class CrmController {
  constructor(
    private crmService: CrmService,
    private automationService: AutomationService,
  ) {}

  @Get('clients')
  getClients(
    @Query('workspaceId') workspaceId: string,
    @Query('stage') stage?: string,
    @Query('source') source?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.crmService.getClients(workspaceId, { stage, source, assignedToId });
  }

  @Get('clients/export/csv')
  @RequireFeature('crm_export')
  @UseGuards(PlanGuard)
  async exportClients(
    @Query('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    const csv = await this.crmService.exportClients(workspaceId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.send(csv);
  }

  @Get('clients/:id')
  getClient(@Param('id') id: string) {
    return this.crmService.getClient(id);
  }

  @Get('clients/:id/activity')
  @RequireFeature('crm_activity_log')
  @UseGuards(PlanGuard)
  getActivityLog(@Param('id') clientId: string) {
    return this.crmService.getActivityLog(clientId);
  }

  @Post('clients')
  createClient(@Body() dto: CreateClientDto) {
    return this.crmService.createClient(dto);
  }

  @Patch('clients/:id')
  @RequireFeature('crm_full')
  @UseGuards(PlanGuard)
  updateClient(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.crmService.updateClient(id, { ...body, userId: req.user?.id });
  }

  @Patch('clients/:id/stage')
  updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto, @Req() req: any) {
    return this.crmService.updateStage(id, dto.stage, req.user?.id);
  }

  @Delete('clients/:id')
  deleteClient(@Param('id') id: string) {
    return this.crmService.deleteClient(id);
  }

  @Post('notes')
  addNote(@Body() dto: CreateNoteDto, @Req() req: any) {
    return this.crmService.addNote({ ...dto, userId: req.user?.id });
  }

  @Post('tasks')
  addTask(@Body() dto: CreateTaskDto, @Req() req: any) {
    return this.crmService.addTask({ ...dto, userId: req.user?.id });
  }

  @Patch('tasks/:id/toggle')
  toggleTask(@Param('id') id: string, @Req() req: any) {
    return this.crmService.toggleTask(id, req.user?.id);
  }

  @Get('pipeline/:workspaceId')
  @RequireFeature('crm_pipeline')
  @UseGuards(PlanGuard)
  getPipelineStats(@Param('workspaceId') workspaceId: string) {
    return this.crmService.getPipelineStats(workspaceId);
  }

  @Get('automations/:workspaceId')
  getAutomations(@Param('workspaceId') workspaceId: string) {
    return this.automationService.getRules(workspaceId);
  }

  @Post('automations')
  createAutomation(@Body() body: any) {
    return this.automationService.createRule(body.workspaceId, body);
  }

  @Patch('automations/:id')
  updateAutomation(@Param('id') id: string, @Body() body: any) {
    return this.automationService.updateRule(id, body);
  }

  @Delete('automations/:id')
  deleteAutomation(@Param('id') id: string) {
    return this.automationService.deleteRule(id);
  }
}
