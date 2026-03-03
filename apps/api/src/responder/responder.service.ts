import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';

@Injectable()
export class ResponderService {
  constructor(private prisma: PrismaService) {}

  async getRules(workspaceId: string) {
    return this.prisma.autoResponderRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(dto: CreateRuleDto) {
    return this.prisma.autoResponderRule.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        platform: dto.platform,
        triggerType: dto.triggerType,
        keywords: dto.keywords || [],
        responseMessage: dto.responseMessage,
        responseType: dto.responseType || 'comment',
        isActive: dto.isActive ?? true,
        updateLeadStage: dto.updateLeadStage,
      },
    });
  }

  async toggleRule(id: string) {
    const rule = await this.prisma.autoResponderRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Rule not found');
    return this.prisma.autoResponderRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });
  }

  async deleteRule(id: string) {
    return this.prisma.autoResponderRule.delete({ where: { id } });
  }

  async getStats(workspaceId: string) {
    const rules = await this.prisma.autoResponderRule.findMany({
      where: { workspaceId },
    });
    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      totalTriggers: rules.reduce((sum, r) => sum + r.triggerCount, 0),
      platforms: [...new Set(rules.map(r => r.platform))].length,
    };
  }
}
