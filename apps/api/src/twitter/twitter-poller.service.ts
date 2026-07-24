import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

interface OAuthState {
  workspaceId: string;
  userId: string;
  codeVerifier: string;
}

@Injectable()
export class TwitterPollerService {
  private readonly logger = new Logger(TwitterPollerService.name);
  private readonly bearerToken = process.env.TWITTER_BEARER_TOKEN;

  /** In-memory PKCE state store: state token → { workspaceId, userId, codeVerifier }
   *  Each entry self-destructs after 10 minutes (OAuth timeout guard). */
  private readonly oauthStateStore = new Map<string, OAuthState>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // ─── Token encryption ────────────────────────────────────────────────────
  // AES-256-CBC — identical pattern to SocialService so tokens are interoperable.

  private encryptToken(token: string): string {
    const key = Buffer.from(this.config.get<string>('ENCRYPTION_KEY')!, 'hex');
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptToken(encryptedToken: string): string {
    try {
      const [ivHex, encrypted] = encryptedToken.split(':');
      if (!ivHex || !encrypted) return encryptedToken; // legacy unencrypted — return as-is
      const key = Buffer.from(this.config.get<string>('ENCRYPTION_KEY')!, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    } catch {
      return encryptedToken;
    }
  }

  // ─── PKCE helpers ─────────────────────────────────────────────────────────

  private generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  // ─── OAuth 2.0 PKCE — Step 1: Generate auth URL ──────────────────────────

  getOAuthUrl(workspaceId: string, userId: string): string {
    const clientId = this.config.get<string>('TWITTER_CLIENT_ID');
    const redirectUri = this.config.get<string>('TWITTER_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      throw new Error(
        'Twitter OAuth not configured — set TWITTER_CLIENT_ID and TWITTER_REDIRECT_URI in Railway',
      );
    }

    const state = randomBytes(16).toString('hex');
    const { codeVerifier, codeChallenge } = this.generatePKCE();

    // Store state — auto-expire after 10 min so stale states never linger
    this.oauthStateStore.set(state, { workspaceId, userId, codeVerifier });
    setTimeout(() => this.oauthStateStore.delete(state), 10 * 60 * 1000);

    const url = new URL('https://twitter.com/i/oauth2/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    this.logger.debug(`Generated Twitter OAuth URL for workspace ${workspaceId}`);
    return url.toString();
  }

  // ─── OAuth 2.0 PKCE — Step 2: Exchange code for tokens ───────────────────

  async handleOAuthCallback(code: string, state: string): Promise<void> {
    const stored = this.oauthStateStore.get(state);
    if (!stored) {
      throw new Error(
        'Invalid or expired OAuth state — the authorisation window may have timed out. Please try connecting again.',
      );
    }

    const { workspaceId, userId, codeVerifier } = stored;
    this.oauthStateStore.delete(state); // single-use state

    const clientId = this.config.get<string>('TWITTER_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('TWITTER_CLIENT_SECRET')!;
    const redirectUri = this.config.get<string>('TWITTER_REDIRECT_URI')!;

    // Exchange auth code + PKCE verifier for access & refresh tokens
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    let tokenData: any;
    try {
      const tokenRes = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );
      tokenData = tokenRes.data;
    } catch (err: any) {
      const detail = err?.response?.data?.error_description || err.message;
      const fullBody = JSON.stringify(err?.response?.data || {});
      this.logger.error(`Twitter token exchange failed: ${detail} | full response: ${fullBody}`);
      throw new Error(`Token exchange failed: ${detail}`);
    }

    const { access_token, refresh_token } = tokenData;
    if (!access_token) throw new Error('No access token returned from Twitter');

    // Fetch the authenticated user's profile (handle + numeric ID)
    const userRes = await axios.get('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const twitterUser = userRes.data?.data;
    if (!twitterUser?.id) throw new Error('Could not retrieve Twitter user profile');

    const twitterUserId: string = twitterUser.id;
    const twitterHandle = `@${twitterUser.username}`;

    // Upsert SocialAccount with encrypted tokens
    await this.prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_accountId: {
          workspaceId,
          platform: 'TWITTER',
          accountId: twitterUserId,
        },
      },
      create: {
        workspaceId,
        platform: 'TWITTER',
        accountName: twitterHandle,
        accountId: twitterUserId,
        accessToken: this.encryptToken(access_token),
        refreshToken: refresh_token ? this.encryptToken(refresh_token) : null,
        isActive: true,
      },
      update: {
        accountName: twitterHandle,
        accessToken: this.encryptToken(access_token),
        refreshToken: refresh_token ? this.encryptToken(refresh_token) : null,
        isActive: true,
      },
    });

    this.logger.log(
      `✅ Twitter OAuth connected: ${twitterHandle} (${twitterUserId}) for workspace ${workspaceId}`,
    );

    // Trigger immediate mention poll so inbox populates right away
    await this.triggerPollForWorkspace(workspaceId);
  }

  // ─── Token refresh ────────────────────────────────────────────────────────

  async refreshAccessToken(account: any): Promise<string | null> {
    if (!account.refreshToken) return null;

    const clientId = this.config.get<string>('TWITTER_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('TWITTER_CLIENT_SECRET')!;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const decryptedRefresh = this.decryptToken(account.refreshToken);
      const res = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: decryptedRefresh,
          client_id: clientId,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );

      const { access_token, refresh_token: newRefresh } = res.data;
      await this.prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: this.encryptToken(access_token),
          ...(newRefresh && { refreshToken: this.encryptToken(newRefresh) }),
        },
      });

      this.logger.debug(`Refreshed Twitter token for ${account.accountName}`);
      return access_token as string;
    } catch (err: any) {
      this.logger.error(
        `Token refresh failed for ${account.accountName}: ${err?.response?.data?.error_description || err.message}`,
      );
      return null;
    }
  }

  // ─── Send a reply tweet (user OAuth token required) ───────────────────────

  async replyToTweet(tweetId: string, text: string, workspaceId: string): Promise<void> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { workspaceId, platform: 'TWITTER', isActive: true },
    });

    if (!account?.accessToken) {
      throw new Error(
        'No Twitter account with OAuth tokens connected — please reconnect via Settings → Social Accounts.',
      );
    }

    let accessToken = this.decryptToken(account.accessToken);

    const post = async (token: string) =>
      axios.post(
        'https://api.twitter.com/2/tweets',
        { text, reply: { in_reply_to_tweet_id: tweetId } },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

    try {
      await post(accessToken);
    } catch (err: any) {
      if (err?.response?.status === 401 && account.refreshToken) {
        // Token expired — try to refresh and retry once
        const newToken = await this.refreshAccessToken(account);
        if (!newToken) throw new Error('Twitter access token expired and refresh failed');
        await post(newToken);
      } else {
        const detail = err?.response?.data?.detail || err.message;
        throw new Error(`Failed to post reply: ${detail}`);
      }
    }
  }

  // ─── @Mention polling (bearer token — no change from original) ────────────

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
