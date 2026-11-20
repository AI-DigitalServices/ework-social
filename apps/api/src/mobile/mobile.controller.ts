import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/jwt.guard';
import { WorkspaceMemberGuard } from '../common/workspace-member.guard';
import { MobileAuthService } from './mobile-auth.service';
import { MobileConfigService } from './mobile-config.service';
import { MobileDevicesService } from './mobile-devices.service';
import { MobileHomeService } from './mobile-home.service';
import { MobileNotificationsService } from './mobile-notifications.service';
import { MobilePostsService } from './mobile-posts.service';
import { RegisterDeviceDto, SocialLoginDto, UnregisterDeviceDto } from './dto/mobile.dto';
import { PostActionDto } from './dto/post-action.dto';
import { EditPostDto } from './dto/edit-post.dto';

/**
 * Mobile API, served at /api/mobile/v1. Additive: nothing here changes the web
 * routes. Routes that need no workspace (sign-in, config, devices, notifications)
 * use JwtGuard only. Workspace routes carry :workspaceId and also go through
 * WorkspaceMemberGuard. Routes addressed by post id are checked inside
 * MobilePostsService (membership, role, writable workspace, freshness).
 */
@Controller('mobile/v1')
export class MobileController {
  constructor(
    private auth: MobileAuthService,
    private appConfig: MobileConfigService,
    private devices: MobileDevicesService,
    private home: MobileHomeService,
    private notifications: MobileNotificationsService,
    private posts: MobilePostsService,
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

  @Get('workspaces/:workspaceId/posts')
  @UseGuards(JwtGuard, WorkspaceMemberGuard)
  listPosts(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posts.listPosts(workspaceId, status, cursor, limit);
  }

  @Get('workspaces/:workspaceId/approvals')
  @UseGuards(JwtGuard, WorkspaceMemberGuard)
  listApprovals(@Param('workspaceId') workspaceId: string, @Query('status') status?: string) {
    return this.posts.listApprovals(workspaceId, status);
  }

  @Get('posts/:postId')
  @UseGuards(JwtGuard)
  getPost(@Request() req: any, @Param('postId') postId: string) {
    return this.posts.getPost(postId, req.user.sub);
  }

  @Post('posts/:postId/publish-now')
  @HttpCode(200)
  @UseGuards(JwtGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  publishNow(@Request() req: any, @Param('postId') postId: string, @Body() dto: PostActionDto) {
    return this.posts.publishNow(postId, req.user.sub, dto.expectedUpdatedAt);
  }

  @Post('posts/:postId/retry')
  @HttpCode(200)
  @UseGuards(JwtGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  retryPost(@Request() req: any, @Param('postId') postId: string, @Body() dto: PostActionDto) {
    return this.posts.retry(postId, req.user.sub, dto.expectedUpdatedAt);
  }

  @Patch('posts/:postId')
  @UseGuards(JwtGuard)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  editPost(@Request() req: any, @Param('postId') postId: string, @Body() dto: EditPostDto) {
    return this.posts.editPost(postId, req.user.sub, dto);
  }

  @Post('posts/:postId/delete')
  @HttpCode(200)
  @UseGuards(JwtGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  deletePost(@Request() req: any, @Param('postId') postId: string, @Body() dto: PostActionDto) {
    return this.posts.deletePost(postId, req.user.sub, dto.expectedUpdatedAt);
  }
}
