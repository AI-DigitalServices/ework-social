import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ResponderService } from './responder.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { PlanGuardService } from '../common/plan-guard.service';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';
import { WriterRoleGuard } from '../common/role.guards';
import { PrismaService } from '../prisma/prisma.service';
import { assertRecordWriteAccess } from '../common/record-access.util';

@Controller('responder')
@UseGuards(JwtGuard, WorkspaceMemberGuard)
export class ResponderController {
  constructor(
    private responderService: ResponderService,
    private planGuard: PlanGuardService,
    private prisma: PrismaService,
  ) {}

  @Get('rules')
  getRules(@Query('workspaceId') workspaceId: string) {
    return this.responderService.getRules(workspaceId);
  }

  @Post('rules')
  @UseGuards(WriterRoleGuard)
  async createRule(@Body() dto: CreateRuleDto) {
    // 🔒 Starter+ required; enforces per-plan rule count cap
    await this.planGuard.checkAutoResponderRuleLimit(dto.workspaceId);
    return this.responderService.createRule(dto);
  }

  @Patch('rules/:id/toggle')
  async toggleRule(@Param('id') id: string, @Req() req: any) {
    await assertRecordWriteAccess(this.prisma, this.planGuard, {
      model: 'autoResponderRule', id, userId: req.user.sub, label: 'Rule',
    });
    return this.responderService.toggleRule(id);
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id') id: string, @Req() req: any) {
    await assertRecordWriteAccess(this.prisma, this.planGuard, {
      model: 'autoResponderRule', id, userId: req.user.sub, label: 'Rule',
    });
    return this.responderService.deleteRule(id);
  }

  @Get('stats')
  getStats(@Query('workspaceId') workspaceId: string) {
    return this.responderService.getStats(workspaceId);
  }
}
