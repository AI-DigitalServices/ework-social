import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AutomationService } from './automation.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('crm')
@UseGuards(JwtGuard)
export class CrmController {
  constructor(
    private crmService: CrmService,
    private automationService: AutomationService,
  ) {}

  @Get('clients')
  getClients(@Query('workspaceId') workspaceId: string) {
    return this.crmService.getClients(workspaceId);
  }

  @Get('clients/:id')
  getClient(@Param('id') id: string) {
    return this.crmService.getClient(id);
  }

  @Post('clients')
  createClient(@Body() dto: CreateClientDto) {
    return this.crmService.createClient(dto);
  }

  @Patch('clients/:id/stage')
  updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.crmService.updateStage(id, dto.stage);
  }

  @Delete('clients/:id')
  deleteClient(@Param('id') id: string) {
    return this.crmService.deleteClient(id);
  }

  @Post('notes')
  addNote(@Body() dto: CreateNoteDto) {
    return this.crmService.addNote(dto);
  }

  @Post('tasks')
  addTask(@Body() dto: CreateTaskDto) {
    return this.crmService.addTask(dto);
  }

  @Patch('tasks/:id/toggle')
  toggleTask(@Param('id') id: string) {
    return this.crmService.toggleTask(id);
  }

  @Get('pipeline/:workspaceId')
  getPipelineStats(@Param('workspaceId') workspaceId: string) {
    return this.crmService.getPipelineStats(workspaceId);
  }

  @Get('automations/:workspaceId')
  @UseGuards(JwtGuard)
  getAutomations(@Param('workspaceId') workspaceId: string) {
    return this.automationService.getRules(workspaceId);
  }

  @Post('automations')
  @UseGuards(JwtGuard)
  createAutomation(@Body() body: any) {
    return this.automationService.createRule(body.workspaceId, body);
  }

  @Patch('automations/:id')
  @UseGuards(JwtGuard)
  updateAutomation(@Param('id') id: string, @Body() body: any) {
    return this.automationService.updateRule(id, body);
  }

  @Delete('automations/:id')
  @UseGuards(JwtGuard)
  deleteAutomation(@Param('id') id: string) {
    return this.automationService.deleteRule(id);
  }
}
