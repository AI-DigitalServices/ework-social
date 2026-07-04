import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class TwitterPollerService {
  private readonly logger = new Logger(TwitterPollerService.name);
  private readonly bearerToken = process.env.TWITTER_BEARER_TOKEN;

  constructor(private prisma: PrismaService) {}

  /**
   * Poll every 10 minutes for new @mentions.
   * Uses GET /2/users/:id/mentions — available on FREE tier.
   * (search/recent requires Basic $100/month — avoided intentionally)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async pollMentions() {
    if (!this.bearerToken) {
      this.logger.warn('TWITTER_BEARER_TOKEN not set — skipping poll');
      return;
    }

    const accounts = await this.prisma.socialAccount.findMany({
      where: { platform: 'TWITTER', isActive: true },
    });

    if (accounts.length === 0) return;

    this.logger.log(`Polling Twitter mentions for ${accounts.length} account(s)`);

    for (const account of accounts) {
      try {
        await this.pollForAccount(account);
      } catch (err: any) {
        this.logger.error(
          `Twitter poll failed for @${account.accountName}: ${err.message}`,
        );
      }
    }
  }

  private async pollForAccount(account: any) {
    const handle = account.accountName.replace('@', '');
    const workspaceId = account.workspaceId;

    // accountId is the Twitter numeric user ID (stored on connect)
    // If it looks like it wasn't resolved (same as handle text), skip
    const userId = account.accountId;
    if (!userId || isNaN(Number(userId))) {
      this.logger.warn(
        `@${handle}: no valid Twitter user ID stored — reconnect the account to fix this`,
      );
      return;
    }

    // Find the most recent mention we already have — use as since_id
    // Twitter snowflake IDs are chronologically ordered, so newest externalId = highest ID
    const lastMessage = await this.prisma.inboxMessage.findFirst({
      where: { workspaceId, platform: 'TWITTER', socialAccountId: account.id },
      orderBy: { createdAt: 'desc' },
      select: { externalId: true },
    });

    // FREE TIER endpoint: GET /2/users/:id/mentions
    const params: any = {
      max_results: 10,
      'tweet.fields': 'created_at,author_id,text,conversation_id',
      'user.fields': 'name,username,profile_image_url',
      expansions: 'author_id',
    };

    if (lastMessage?.externalId) {
      // Only fetch tweets newer than the last one we stored
      params.since_id = lastMessage.externalId;
    } else {
      // First ever poll — limit to last 60 minutes to avoid flooding inbox
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      params.start_time = oneHourAgo.toISOString();
    }

    let response: any;
    try {
      response = await axios.get(
        `https://api.twitter.com/2/users/${userId}/mentions`,
        {
          params,
          headers: { Authorization: `Bearer ${this.bearerToken}` },
        },
      );
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err.message;

      if (status === 401) {
        this.logger.error(`Bearer token invalid or expired`);
      } else if (status === 403) {
        this.logger.error(`Access denied for @${handle} — check app permissions`);
      } else if (status === 429) {
        this.logger.warn(`Rate limited — will retry next poll cycle`);
      } else {
        this.logger.error(`Twitter API error for @${handle}: ${status} — ${detail}`);
      }
      return;
    }

    const tweets: any[] = response.data?.data || [];
    const users: any[] = response.data?.includes?.users || [];

    if (tweets.length === 0) {
      this.logger.debug(`No new mentions for @${handle}`);
      return;
    }

    this.logger.log(`Found ${tweets.length} new mention(s) for @${handle}`);

    for (const tweet of tweets) {
      const author = users.find((u: any) => u.id === tweet.author_id);

      try {
        await this.prisma.inboxMessage.upsert({
          where: {
            platform_externalId: {
              platform: 'TWITTER',
              externalId: tweet.id,
            },
          },
          create: {
            workspaceId,
            platform: 'TWITTER',
            type: 'COMMENT',
            externalId: tweet.id,
            senderId: tweet.author_id,
            senderName: author ? `@${author.username}` : `@user_${tweet.author_id}`,
            senderAvatar: author?.profile_image_url || null,
            content: tweet.text,
            postContent: `Mentioned @${handle} on X / Twitter`,
            isRead: false,
            isResolved: false,
            socialAccountId: account.id,
          },
          update: {}, // already exists — no-op
        });
      } catch (err: any) {
        if (!err.message?.includes('Unique constraint')) {
          this.logger.error(`Failed to save tweet ${tweet.id}: ${err.message}`);
        }
      }
    }
  }

  /**
   * Fires immediately when a Twitter account is first connected
   * so the user sees their recent mentions right away.
   */
  async triggerPollForWorkspace(workspaceId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId, platform: 'TWITTER', isActive: true },
    });
    for (const account of accounts) {
      await this.pollForAccount(account).catch(err =>
        this.logger.error(`Manual poll failed: ${err.message}`),
      );
    }
  }
}
