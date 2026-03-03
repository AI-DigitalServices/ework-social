import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('analytics')
@UseGuards(JwtGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboardStats(@Query('workspaceId') workspaceId: string) {
    return this.analyticsService.getDashboardStats(workspaceId);
  }

  @Get('activity')
  getPostActivity(@Query('workspaceId') workspaceId: string) {
    return this.analyticsService.getPostActivity(workspaceId);
  }

  @Get('pipeline')
  getPipelineBreakdown(@Query('workspaceId') workspaceId: string) {
    return this.analyticsService.getPipelineBreakdown(workspaceId);
  }

  @Get('platforms')
  getPlatformBreakdown(@Query('workspaceId') workspaceId: string) {
    return this.analyticsService.getPlatformBreakdown(workspaceId);
  }

  @Get('recent-posts')
  getRecentPosts(@Query('workspaceId') workspaceId: string) {
    return this.analyticsService.getRecentPosts(workspaceId);
  }
}
