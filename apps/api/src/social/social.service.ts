import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class SocialService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  // Generate Facebook OAuth URL
  getFacebookAuthUrl(workspaceId: string, userId: string) {
    const appId = this.config.get('META_APP_ID');
    const redirectUri = this.config.get('META_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ workspaceId, userId })).toString('base64');

    const scopes = [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'instagram_manage_comments',
      'pages_messaging',
      'public_profile',
      'email',
    ].join(',');

    return {
      url: `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`,
    };
  }

  // Handle OAuth callback
  async handleFacebookCallback(code: string, state: string) {
    const appId = this.config.get('META_APP_ID');
    const appSecret = this.config.get('META_APP_SECRET');
    const redirectUri = this.config.get('META_REDIRECT_URI');

    // Decode state
    let workspaceId: string;
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      workspaceId = decoded.workspaceId;
      userId = decoded.userId;
    } catch {
      throw new BadRequestException('Invalid state parameter');
    }

    // Exchange code for access token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      },
    });

    const shortLivedToken = tokenRes.data.access_token;

    // Exchange for long-lived token
    const longLivedRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = longLivedRes.data.access_token;

    // Get user info
    const userRes = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: {
        access_token: longLivedToken,
        fields: 'id,name,email',
      },
    });

    // Get user's Facebook Pages
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { access_token: longLivedToken },
    });

    const pages = pagesRes.data.data || [];
    const connectedAccounts: any[] = [];

    for (const page of pages) {
      // Save Facebook Page
      const fbAccount = await this.prisma.socialAccount.upsert({
        where: {
          workspaceId_platform_accountId: {
            workspaceId,
            platform: 'FACEBOOK',
            accountId: page.id,
          },
        },
        update: {
          accountName: page.name,
          accessToken: page.access_token,
          isActive: true,
        },
        create: {
          workspaceId,
          platform: 'FACEBOOK',
          accountId: page.id,
          accountName: page.name,
          accessToken: page.access_token,
          isActive: true,
        },
      });
      connectedAccounts.push(fbAccount);

      // Check for connected Instagram Business Account
      try {
        const igRes = await axios.get(
          `https://graph.facebook.com/v19.0/${page.id}`,
          {
            params: {
              fields: 'instagram_business_account',
              access_token: page.access_token,
            },
          },
        );

        if (igRes.data.instagram_business_account) {
          const igId = igRes.data.instagram_business_account.id;

          // Get Instagram account details
          const igDetailsRes = await axios.get(
            `https://graph.facebook.com/v19.0/${igId}`,
            {
              params: {
                fields: 'id,name,username,profile_picture_url,followers_count',
                access_token: page.access_token,
              },
            },
          );

          const igDetails = igDetailsRes.data;

          const igAccount = await this.prisma.socialAccount.upsert({
            where: {
              workspaceId_platform_accountId: {
                workspaceId,
                platform: 'INSTAGRAM',
                accountId: igId,
              },
            },
            update: {
              accountName: igDetails.username || igDetails.name,
              accessToken: page.access_token,
              isActive: true,
            },
            create: {
              workspaceId,
              platform: 'INSTAGRAM',
              accountId: igId,
              accountName: igDetails.username || igDetails.name,
              accessToken: page.access_token,
              isActive: true,
            },
          });
          connectedAccounts.push(igAccount);
        }
      } catch (igErr) {
        console.log(`No Instagram account for page ${page.name}`);
      }
    }

    return {
      success: true,
      connectedAccounts,
      message: `Connected ${connectedAccounts.length} account(s) successfully`,
    };
  }

  // Disconnect a social account
  async disconnectAccount(accountId: string, workspaceId: string) {
    await this.prisma.socialAccount.updateMany({
      where: { id: accountId, workspaceId },
      data: { isActive: false, accessToken: null },
    });
    return { success: true };
  }

  // Get connected accounts
  async getAccounts(workspaceId: string) {
    return this.prisma.socialAccount.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Publish post to Facebook
  async publishToFacebook(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });

    if (!post || !post.socialAccount?.accessToken) {
      throw new BadRequestException('Post or account not found');
    }

    try {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${post.socialAccount.accountId}/feed`,
        {
          message: post.content,
          access_token: post.socialAccount.accessToken,
        },
      );

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          externalId: res.data.id,
        },
      });

      return { success: true, postId: res.data.id };
    } catch (err: any) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(
        err.response?.data?.error?.message || 'Failed to publish post',
      );
    }
  }

  // Publish post to Instagram
  async publishToInstagram(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });

    if (!post || !post.socialAccount?.accessToken) {
      throw new BadRequestException('Post or account not found');
    }

    try {
      // Step 1: Create media container
      const mediaRes = await axios.post(
        `https://graph.facebook.com/v19.0/${post.socialAccount.accountId}/media`,
        null,
        {
          params: {
            caption: post.content,
            media_type: 'TEXT',
            access_token: post.socialAccount.accessToken,
          },
        },
      );

      const creationId = mediaRes.data.id;

      // Step 2: Publish the container
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${post.socialAccount.accountId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: post.socialAccount.accessToken,
          },
        },
      );

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          externalId: publishRes.data.id,
        },
      });

      return { success: true, postId: publishRes.data.id };
    } catch (err: any) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(
        err.response?.data?.error?.message || 'Failed to publish to Instagram',
      );
    }
  }
}
