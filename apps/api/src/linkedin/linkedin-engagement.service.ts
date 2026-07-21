import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createDecipheriv } from 'crypto';
import axios from 'axios';

@Injectable()
export class LinkedInEngagementService {
  private readonly logger = new Logger(LinkedInEngagementService.name);

  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Cron: poll every 10 minutes for comments on org posts
  // ─────────────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_10_MINUTES)
  async pollLinkedInComments() {
    // Only poll org accounts — personal LinkedIn accounts can't receive comments on org posts
    const orgAccounts = await this.prisma.socialAccount.findMany({
      where: {
        platform: 'LINKEDIN',
        isActive: true,
        accountId: { startsWith: 'urn:li:' }, // org accounts have full URN
      },
    });

    if (orgAccounts.length === 0) return;

    this.logger.log(`LinkedIn engagement: polling ${orgAccounts.length} org account(s)`);

    for (const account of orgAccounts) {
      try {
        await this.pollForOrgAccount(account);
      } catch (err: any) {
        this.logger.error(
          `LinkedIn poll failed for org ${account.accountId}: ${err?.message}`,
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Manual trigger — call from a controller if needed during testing
  // ─────────────────────────────────────────────────────────────────────────

  async triggerPollForWorkspace(workspaceId: string) {
    const orgAccounts = await this.prisma.socialAccount.findMany({
      where: {
        workspaceId,
        platform: 'LINKEDIN',
        isActive: true,
        accountId: { startsWith: 'urn:li:' },
      },
    });

    for (const account of orgAccounts) {
      await this.pollForOrgAccount(account);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private decryptToken(encryptedToken: string): string {
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const [ivHex, encrypted] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  }

  private async pollForOrgAccount(account: any) {
    const accessToken = this.decryptToken(account.accessToken!);
    const orgUrn: string = account.accountId!; // e.g. urn:li:organization:12345

    // Fetch the 10 most recently modified posts for this org
    // The authors param uses LinkedIn's "List" syntax
    const postsUrl =
      `https://api.linkedin.com/v2/ugcPosts` +
      `?q=authors` +
      `&authors=List(${encodeURIComponent(orgUrn)})` +
      `&count=10` +
      `&sortBy=LAST_MODIFIED`;

    let postsRes: any;
    try {
      postsRes = await axios.get(postsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        this.logger.warn(
          `LinkedIn token expired/invalid for org ${orgUrn} — skipping until reconnected`,
        );
        return;
      }
      throw err;
    }

    const posts: any[] = postsRes.data?.elements || [];
    this.logger.debug(`LinkedIn: found ${posts.length} posts for ${orgUrn}`);

    for (const post of posts) {
      const postUrn: string = post.id; // urn:li:ugcPost:12345
      const postText: string =
        post.specificContent?.['com.linkedin.ugc.ShareContent']
          ?.shareCommentary?.text || '';

      try {
        await this.fetchAndStoreComments(account, accessToken, orgUrn, postUrn, postText);
      } catch (err: any) {
        this.logger.warn(`LinkedIn: failed to fetch comments for ${postUrn}: ${err?.message}`);
      }
    }
  }

  private async fetchAndStoreComments(
    account: any,
    accessToken: string,
    orgUrn: string,
    postUrn: string,
    postText: string,
  ) {
    // socialActions/{postUrn}/comments returns top-level comments on a post
    const commentsUrl =
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments` +
      `?count=50`;

    const commentsRes = await axios.get(commentsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    const comments: any[] = commentsRes.data?.elements || [];

    for (const comment of comments) {
      const commentUrn: string = comment.id; // urn:li:comment:(urn:li:activity:xxx,yyy)
      const actorUrn: string = comment.actor || '';

      // Skip comments the org itself made (would create infinite reply loops)
      if (actorUrn === orgUrn) continue;

      const commentText: string = comment.message?.text || '';
      if (!commentText.trim()) continue;

      // Upsert — never overwrite if already in the inbox (preserve isRead, tags, etc.)
      await this.prisma.inboxMessage.upsert({
        where: {
          platform_externalId: { platform: 'LINKEDIN', externalId: commentUrn },
        },
        create: {
          workspaceId: account.workspaceId,
          platform:    'LINKEDIN',
          type:        'COMMENT',
          externalId:  commentUrn,
          postId:      postUrn,
          postContent: postText.slice(0, 280),
          content:     commentText,
          senderId:    actorUrn,
          senderName:  'LinkedIn User',
          isRead:      false,
          isResolved:  false,
          tags:        [],
          socialAccountId: account.id,
        },
        update: {}, // intentionally no-op on repeat polls
      });
    }

    this.logger.debug(
      `LinkedIn: stored/checked ${comments.length} comment(s) for post ${postUrn}`,
    );
  }
}
