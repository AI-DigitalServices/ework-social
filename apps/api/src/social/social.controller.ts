import {
  Controller, Get, Post, Delete,
  Query, Param, Body, UseGuards,
  Req, Res,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtGuard } from '../auth/jwt.guard';
import type { Response } from 'express';

@Controller('social')
export class SocialController {
  constructor(private socialService: SocialService) {}

  @Get('facebook/auth-url')
  @UseGuards(JwtGuard)
  getFacebookAuthUrl(
    @Query('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    return this.socialService.getFacebookAuthUrl(workspaceId, req.user.sub);
  }

  @Get('facebook/callback')
  async facebookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (error || !code || !state) {
      console.log('Facebook callback aborted — error:', error, 'code present:', !!code, 'state present:', !!state);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=cancelled`);
    }

    try {
      await this.socialService.handleFacebookCallback(code, state);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&success=connected`);
    } catch (err: any) {
      console.error('OAuth error:', err);
      const errorCode = err?.message === 'no_pages_found' ? 'no_pages' : 'failed';
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=${errorCode}`);
    }
  }

  @Get('accounts')
  @UseGuards(JwtGuard)
  getAccounts(@Query('workspaceId') workspaceId: string) {
    return this.socialService.getAccounts(workspaceId);
  }

  @Delete('accounts/:id')
  @UseGuards(JwtGuard)
  disconnectAccount(
    @Param('id') id: string,
    @Body() body: { workspaceId: string },
  ) {
    return this.socialService.disconnectAccount(id, body.workspaceId);
  }

  @Get('linkedin/auth-url')
  @UseGuards(JwtGuard)
  getLinkedInAuthUrl(@Query('workspaceId') workspaceId: string, @Req() req: any) {
    return this.socialService.getLinkedInAuthUrl(workspaceId, req.user.sub);
  }

  @Get('linkedin/callback')
  async linkedInCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (error) return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=cancelled`);
    try {
      await this.socialService.handleLinkedInCallback(code, state);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&success=connected`);
    } catch (err) {
      console.error('LinkedIn OAuth error:', err);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=failed`);
    }
  }

  @Post('publish/:postId')
  @UseGuards(JwtGuard)
  async publishPost(
    @Param('postId') postId: string,
    @Body() body: { platform: string },
  ) {
    if (body.platform === 'INSTAGRAM') return this.socialService.publishToInstagram(postId);
    if (body.platform === 'LINKEDIN') return this.socialService.publishToLinkedIn(postId);
    if (body.platform === 'TIKTOK') return this.socialService.publishToTikTok(postId);
    if (body.platform === 'YOUTUBE') return this.socialService.publishToYouTube(postId);
    if (body.platform === 'BLUESKY') return this.socialService.publishToBluesky(postId);
    if (body.platform === 'THREADS') return this.socialService.publishToThreads(postId);
    return this.socialService.publishToFacebook(postId);
  }

  @Post('bluesky/connect')
  @UseGuards(JwtGuard)
  connectBluesky(@Body() body: { workspaceId: string; identifier: string; appPassword: string }) {
    return this.socialService.connectBluesky(body.workspaceId, body.identifier, body.appPassword);
  }

  // Temporary: manually set a Threads access token generated from Meta Developer Console
  @Post('threads/manual-token')
  @UseGuards(JwtGuard)
  setThreadsToken(@Body() body: { workspaceId: string; accessToken: string }) {
    return this.socialService.setThreadsTokenManually(body.workspaceId, body.accessToken);
  }


  @Get('youtube/auth-url')
  @UseGuards(JwtGuard)
  getYouTubeAuthUrl(@Query('workspaceId') workspaceId: string, @Req() req: any) {
    return this.socialService.getYouTubeAuthUrl(workspaceId, req.user.sub);
  }

  @Get('youtube/callback')
  async youtubeCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (error) return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=cancelled`);
    try {
      await this.socialService.handleYouTubeCallback(code, state);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&success=connected`);
    } catch (err) {
      console.error('YouTube OAuth error:', err);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=failed`);
    }
  }

  @Get('tiktok/auth-url')
  @UseGuards(JwtGuard)
  getTikTokAuthUrl(@Query('workspaceId') workspaceId: string, @Req() req: any) {
    return this.socialService.getTikTokAuthUrl(workspaceId, req.user.sub);
  }

  @Get('threads/auth-url')
  @UseGuards(JwtGuard)
  getThreadsAuthUrl(@Query('workspaceId') workspaceId: string, @Req() req: any) {
    return this.socialService.getThreadsAuthUrl(workspaceId, req.user.sub);
  }

  @Get('threads/callback')
  async threadsCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_reason') errorReason: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (error) {
      console.error('Threads OAuth denied by Meta:', { error, errorReason, errorDescription });
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=cancelled`);
    }
    console.log('Threads callback received — code present:', !!code, 'state present:', !!state);
    try {
      await this.socialService.handleThreadsCallback(code, state);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&success=connected`);
    } catch (err: any) {
      console.error('Threads OAuth token exchange error:', err?.message, err?.response?.data ?? '');
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=failed`);
    }
  }

  @Get('tiktok/callback')
  async tiktokCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (error) return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=cancelled`);
    try {
      await this.socialService.handleTikTokCallback(code, state);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&success=connected`);
    } catch (err) {
      console.error('TikTok OAuth error:', err);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=failed`);
    }
  }

  @Post('facebook/data-deletion')
  async facebookDataDeletion(@Body() body: any, @Res() res: Response) {
    const confirmationCode = `del_${Date.now()}`;
    return res.json({
      url: `https://app.eworksocial.com/privacy?deletion=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  }
}
