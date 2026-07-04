import { Controller, Post, Delete, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { TwitterPollerService } from './twitter-poller.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('twitter')
@UseGuards(JwtGuard)
export class TwitterController {
  constructor(
    private poller: TwitterPollerService,
    private prisma: PrismaService,
  ) {}

  /**
   * GET /twitter/status?workspaceId=xxx
   * Returns connected Twitter accounts for this workspace.
   */
  @Get('status')
  async getStatus(@Query('workspaceId') workspaceId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId, platform: 'TWITTER' },
      select: { id: true, accountName: true, accountId: true, isActive: true, createdAt: true },
    });
    return {
      connected: accounts.length > 0,
      accounts,
      bearerConfigured: !!process.env.TWITTER_BEARER_TOKEN,
    };
  }

  /**
   * POST /twitter/connect
   * Connect a Twitter handle to this workspace.
   * Body: { workspaceId, handle }  e.g. handle = "eworksocial" (without @)
   */
  @Post('connect')
  async connect(
    @Body() body: { workspaceId: string; handle: string },
    @Request() req: any,
  ) {
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
  async manualPoll(@Body() body: { workspaceId: string }) {
    await this.poller.triggerPollForWorkspace(body.workspaceId);
    return { success: true, message: 'Poll triggered' };
  }
}
