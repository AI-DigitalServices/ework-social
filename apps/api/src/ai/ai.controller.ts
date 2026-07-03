import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiUsageService } from './ai-usage.service';
import { JwtGuard } from '../auth/jwt.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('ai')
@UseGuards(JwtGuard)
export class AiController {
  constructor(private aiService: AiService, private aiUsage: AiUsageService) {}

  @Post('captions')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  generateCaptions(@Body() body: {
    workspaceId: string;
    topic: string;
    platform: string;
    tone: string;
    clientName?: string;
  }) {
    return this.aiService.generateCaptions(
      body.workspaceId,
      body.topic,
      body.platform,
      body.tone,
      body.clientName,
    );
  }

  @Post('hashtags')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  generateHashtags(@Body() body: {
    workspaceId: string;
    content: string;
    platform: string;
  }) {
    return this.aiService.generateHashtags(
      body.workspaceId,
      body.content,
      body.platform,
    );
  }

  @Post('rewrite')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  rewritePost(@Body() body: {
    workspaceId: string;
    content: string;
    instruction: string;
    platform: string;
  }) {
    return this.aiService.rewritePost(
      body.workspaceId,
      body.content,
      body.instruction,
      body.platform,
    );
  }

  @Post('crm-insights')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  getCrmInsights(@Body() body: { workspaceId: string }) {
    return this.aiService.getCrmInsights(body.workspaceId);
  }
  @Get('usage')
  @UseGuards(JwtGuard)
  getUsage(@Query('workspaceId') workspaceId: string) {
    return this.aiUsage.getUsage(workspaceId);
  }
}