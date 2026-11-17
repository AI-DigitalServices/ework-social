import { Body, Controller, Get, HttpCode, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';
import { MobileAuthService } from './mobile-auth.service';
import { MobileConfigService } from './mobile-config.service';
import { MobileDevicesService } from './mobile-devices.service';
import { MobileHomeService } from './mobile-home.service';
import { MobileNotificationsService } from './mobile-notifications.service';
import { RegisterDeviceDto, SocialLoginDto, UnregisterDeviceDto } from './dto/mobile.dto';

/**
 * Mobile API, served at /api/mobile/v1. Additive: nothing here changes the web
 * routes. Routes that need no workspace (sign-in, config, devices, notifications)
 * use JwtGuard only. Workspace routes carry :workspaceId and also go through
 * WorkspaceMemberGuard, which checks the caller really belongs to that workspace.
 */
@Controller('mobile/v1')
export class MobileController {
  constructor(
    private auth: MobileAuthService,
    private appConfig: MobileConfigService,
    private devices: MobileDevicesService,
    private home: MobileHomeService,
    private notifications: MobileNotificationsService,
  ) {}

  @Post('auth/social')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.auth.socialLogin(dto);
  }

  @Get('app/config')
  @UseGuards(JwtGuard)
  getConfig(@Request() req: any) {
    return this.appConfig.getConfig(req.user.sub);
  }

  @Post('devices')
  @HttpCode(200)
  @UseGuards(JwtGuard)
  registerDevice(@Request() req: any, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(req.user.sub, dto);
  }

  @Post('devices/unregister')
  @HttpCode(200)
  @UseGuards(JwtGuard)
  unregisterDevice(@Request() req: any, @Body() dto: UnregisterDeviceDto) {
    return this.devices.unregister(req.user.sub, dto.pushToken);
  }

  @Get('notifications')
  @UseGuards(JwtGuard)
  listNotifications(
    @Request() req: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.list(req.user.sub, cursor, limit);
  }

  @Get('workspaces/:workspaceId/home')
  @UseGuards(JwtGuard, WorkspaceMemberGuard)
  getHome(@Request() req: any, @Param('workspaceId') workspaceId: string) {
    return this.home.getHome(req.user.sub, workspaceId);
  }
}
