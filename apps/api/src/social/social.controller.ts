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

    if (error) {
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=cancelled`);
    }

    try {
      await this.socialService.handleFacebookCallback(code, state);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&success=connected`);
    } catch (err) {
      console.error('OAuth error:', err);
      return res.redirect(`${frontendUrl}/dashboard/settings?tab=social&error=failed`);
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
    return this.socialService.publishToFacebook(postId);
  }
}
