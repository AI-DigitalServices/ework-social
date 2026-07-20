import {
  Controller, Post, Delete, Get,
  Body, Query, UseGuards, Request, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { TwitterPollerService } from './twitter-poller.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { PlanGuardService } from '../common/plan-guard.service';

@Controller('twitter')
export class TwitterController {
  constructor(
    private poller: TwitterPollerService,
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
  ) {}

  /**
   * GET /twitter/status?workspaceId=xxx
   * Returns connected Twitter accounts for this workspace.
   */
  @Get('status')
  @UseGuards(JwtGuard)
  async getStatus(@Query('workspaceId') workspaceId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId, platform: 'TWITTER' },
      select: { id: true, accountName: true, accountId: true, isActive: true, createdAt: true },
    });
    return {
      connected: accounts.length > 0,
      accounts,
      bearerConfigured: !!process.env.TWITTER_BEARER_TOKEN,
      oauthConfigured: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
    };
  }

  /**
   * GET /twitter/auth-url?workspaceId=xxx
   * Returns a Twitter OAuth 2.0 PKCE authorization URL.
   * The frontend redirects the browser to this URL — Twitter handles login,
   * then redirects back to /twitter/callback.
   */
  @Get('auth-url')
  @UseGuards(JwtGuard)
  getAuthUrl(
    @Query('workspaceId') workspaceId: string,
    @Request() req: any,
  ) {
    const url = this.poller.getOAuthUrl(workspaceId, req.user.sub);
    return { url };
  }

  /**
   * GET /twitter/callback?code=xxx&state=xxx
   * OAuth 2.0 redirect target — no JWT (Twitter calls this, not the frontend).
   * Exchanges auth code for tokens, saves them, redirects to frontend.
   */
  @Get('callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.eworksocial.com';

    if (error || !code || !state) {
      return res.redirect(
        `${frontendUrl}/dashboard/settings?tab=social&error=cancelled`,
      );
    }

    try {
      await this.poller.handleOAuthCallback(code, state);
      return res.redirect(
        `${frontendUrl}/dashboard/settings?tab=social&success=connected`,
      );
    } catch (err: any) {
      console.error('Twitter OAuth callback error:', err.message);
      return res.redirect(
        `${frontendUrl}/dashboard/settings?tab=social&error=failed`,
      );
    }
  }

  /**
   * POST /twitter/connect  (legacy — kept for backward-compat, no longer used by UI)
   * Connect a Twitter handle manually via bearer-token lookup.
   * The new OAuth flow via /auth-url + /callback supersedes this.
   */
  @Post('connect')
  @UseGuards(JwtGuard)
  async connect(
    @Body() body: { workspaceId: string; handle: string },
    @Request() req: any,
  ) {
    // 🔒 Growth+ required for Twitter inbox
    await this.planGuard.checkTwitterAccess(body.workspaceId);
    const handle = body.handle.replace('@', '').trim().toLowerCase();

    if (!handle) throw new Error('Twitter handle is required');

    // Look up the Twitter user ID via the API (needed for accountId)
    let userId = handle; // fallback: use handle as ID
    try {
      const { default: axios } = await import('axios');
      const res = await axios.get(
        `https://api.twitter.com/2/users/by/username/${handle}`,
        { headers: { Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}` } },
      );
      userId = res.data?.data?.id || handle;
    } catch {
      // If lookup fails, still allow connecting with handle as ID
    }

    const account = await this.prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_accountId: {
          workspaceId: body.workspaceId,
          platform: 'TWITTER',
          accountId: userId,
        },
      },
      create: {
        workspaceId: body.workspaceId,
        platform: 'TWITTER',
        accountName: `@${handle}`,
        accountId: userId,
        isActive: true,
      },
      update: {
        accountName: `@${handle}`,
        isActive: true,
      },
    });

    // Trigger an immediate poll so mentions show up right away
    await this.poller.triggerPollForWorkspace(body.workspaceId);

    return { success: true, account };
  }

  /**
   * DELETE /twitter/disconnect
   * Disconnect a Twitter handle from this workspace.
   * Body: { workspaceId, accountId }
   */
  @Delete('disconnect')
  @UseGuards(JwtGuard)
  async disconnect(@Body() body: { workspaceId: string; accountId: string }) {
    await this.prisma.socialAccount.updateMany({
      where: {
        workspaceId: body.workspaceId,
        platform: 'TWITTER',
        accountId: body.accountId,
      },
      data: { isActive: false },
    });
    return { success: true };
  }

  /**
   * POST /twitter/poll
   * Manually trigger a poll for a workspace (for testing / on-demand refresh).
   */
  @Post('poll')
  @UseGuards(JwtGuard)
  async manualPoll(@Body() body: { workspaceId: string }) {
    await this.poller.triggerPollForWorkspace(body.workspaceId);
    return { success: true, message: 'Poll triggered' };
  }
}
