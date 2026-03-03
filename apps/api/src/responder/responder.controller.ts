import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ResponderService } from './responder.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('responder')
@UseGuards(JwtGuard)
export class ResponderController {
  constructor(private responderService: ResponderService) {}

  @Get('rules')
  getRules(@Query('workspaceId') workspaceId: string) {
    return this.responderService.getRules(workspaceId);
  }

  @Post('rules')
  createRule(@Body() dto: CreateRuleDto) {
    return this.responderService.createRule(dto);
  }

  @Patch('rules/:id/toggle')
  toggleRule(@Param('id') id: string) {
    return this.responderService.toggleRule(id);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.responderService.deleteRule(id);
  }

  @Get('stats')
  getStats(@Query('workspaceId') workspaceId: string) {
    return this.responderService.getStats(workspaceId);
  }
}
