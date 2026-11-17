import { Body, Controller, Get, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/jwt.guard';
import { MobileAuthService } from './mobile-auth.service';
import { MobileConfigService } from './mobile-config.service';
import { MobileDevicesService } from './mobile-devices.service';
import { RegisterDeviceDto, SocialLoginDto, UnregisterDeviceDto } from './dto/mobile.dto';

/**
 * Mobile API, served at /api/mobile/v1. Additive: nothing here changes the web
 * routes. Every route either needs no workspace (sign-in, config, devices) or,
 * in later steps, takes a workspaceId and goes through WorkspaceMemberGuard.
 */
@Controller('mobile/v1')
export class MobileController {
  constructor(
    private auth: MobileAuthService,
    private appConfig: MobileConfigService,
    private devices: MobileDevicesService,
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
}
