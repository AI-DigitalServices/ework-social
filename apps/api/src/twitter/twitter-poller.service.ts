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
   * Poll every 15 minutes for new @mentions of connected Twitter handles.
   * Free tier: 500k tweet reads/month — 15-min polling is well within limit.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async pollMentions() {
    if (!this.bearerToken) {
      this.logger.warn('TWITTER_BEARER_TOKEN not set — skipping poll');
      return;
    }

    // Find all active connected Twitter accounts across all workspaces
    const accounts = await this.prisma.socialAccount.findMany({
      where: { platform: 'TWITTER', isActive: true },
      include: { workspace: { select: { id: true, name: true } } },
    });

    if (accounts.length === 0) return;

    this.logger.log(`Polling Twitter mentions for ${accounts.length} connected account(s)`);

    for (const account of accounts) {
      try {
        await this.pollForAccount(account);
      } catch (err: any) {
        this.logger.error(`Twitter poll failed for @${account.accountName}: ${err.message}`);
      }
    }
  }

  private async pollForAccount(account: any) {
    const handle = account.accountName.replace('@', '');
    const workspaceId = account.workspaceId;

    // Find the most recent tweet we already have for this workspace+handle
    // Twitter snowflake IDs are chronologically ordered — use as since_id
    const lastMessage = await this.prisma.inboxMessage.findFirst({
      where: { workspaceId, platform: 'TWITTER' },
      orderBy: { createdAt: 'desc' },
      select: { externalId: true },
    });

    // Build Twitter API v2 search query
    // Exclude retweets, find genuine @mentions
    const query = `@${handle} -is:retweet`;
    const params: any = {
      query,
      max_results: 10,
      'tweet.fields': 'created_at,author_id,text,conversation_id',
      'user.fields': 'name,username,profile_image_url',
      expansions: 'author_id',
    };

    if (lastMessage?.externalId) {
      params.since_id = lastMessage.externalId;
    } else {
      // First poll — only get mentions from the last 15 minutes
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      params.start_time = fifteenMinsAgo.toISOString();
    }

    const response = await axios.get(
      'https://api.twitter.com/2/tweets/search/recent',
      {
        params,
        headers: { Authorization: `Bearer ${this.bearerToken}` },
      },
    );

    const tweets = response.data?.data;
    const users: any[] = response.data?.includes?.users || [];

    if (!tweets || tweets.length === 0) {
      this.logger.debug(`No new mentions for @${handle}`);
      return;
    }

    this.logger.log(`Found ${tweets.length} new mention(s) for @${handle}`);

    // Save each mention as an InboxMessage
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
            type: 'COMMENT',           // mentions treated as comments
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
          update: {}, // already exists — skip
        });
      } catch (err: any) {
        // Unique constraint violation means we already have it — safe to ignore
        if (!err.message?.includes('Unique constraint')) {
          this.logger.error(`Failed to save tweet ${tweet.id}: ${err.message}`);
        }
      }
    }
  }

  /**
   * Manually trigger a poll for a specific workspace (called when account first connected).
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
