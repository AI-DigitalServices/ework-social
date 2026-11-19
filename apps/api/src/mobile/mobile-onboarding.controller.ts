import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';
import { WriterRoleGuard } from '../common/role.guards';
import { MobileOnboardingService } from './mobile-onboarding.service';
import { AnalyzeWebsiteDto, SavePreferencesDto, SaveProfileDto } from './dto/onboarding.dto';

/**
 * New-business onboarding for the mobile app, served at /api/mobile/v1.
 * Reads need workspace membership; writes also need a writer role (Owner, Admin, Editor)
 * and a writable workspace. Nothing here changes the web routes.
 */
@Controller('mobile/v1')
export class MobileOnboardingController {
  constructor(private onboarding: MobileOnboardingService) {}

  @Get('onboarding/options')
  @UseGuards(JwtGuard)
  options() {
    return this.onboarding.options();
  }

  @Get('workspaces/:workspaceId/onboarding')
  @UseGuards(JwtGuard, WorkspaceMemberGuard)
  state(@Param('workspaceId') workspaceId: string) {
    return this.onboarding.getState(workspaceId);
  }

  @Put('workspaces/:workspaceId/onboarding/profile')
  @UseGuards(JwtGuard, WorkspaceMemberGuard, WriterRoleGuard)
  saveProfile(@Param('workspaceId') workspaceId: string, @Body() dto: SaveProfileDto) {
    return this.onboarding.saveProfile(workspaceId, dto);
  }

  @Put('workspaces/:workspaceId/onboarding/preferences')
  @UseGuards(JwtGuard, WorkspaceMemberGuard, WriterRoleGuard)
  savePreferences(@Param('workspaceId') workspaceId: string, @Body() dto: SavePreferencesDto) {
    return this.onboarding.savePreferences(workspaceId, dto);
  }

  @Post('workspaces/:workspaceId/onboarding/analyze-website')
  @HttpCode(200)
  @UseGuards(JwtGuard, WorkspaceMemberGuard, WriterRoleGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  analyzeWebsite(@Param('workspaceId') workspaceId: string, @Body() dto: AnalyzeWebsiteDto) {
    return this.onboarding.analyzeWebsite(workspaceId, dto.website);
  }
}
