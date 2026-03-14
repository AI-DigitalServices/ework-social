import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

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
      'public_profile',
      'email',
    ].join(',');

    return {
      url: `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`,
    };
  }

  async handleFacebookCallback(code: string, state: string) {
    const appId = this.config.get('META_APP_ID');
    const appSecret = this.config.get('META_APP_SECRET');
    const redirectUri = this.config.get('META_REDIRECT_URI');

    console.log('--- handleFacebookCallback ---');
    console.log('appId:', appId);
    console.log('redirectUri:', redirectUri);
    console.log('code length:', code?.length);

    let workspaceId: string;
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      workspaceId = decoded.workspaceId;
      userId = decoded.userId;
      console.log('workspaceId:', workspaceId);
      console.log('userId:', userId);
    } catch {
      throw new BadRequestException('Invalid state parameter');
    }

    // Step 1: Exchange code for short-lived token
    console.log('Step 1: Exchanging code for token...');
    let shortLivedToken: string;
    try {
      const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
      });
      shortLivedToken = tokenRes.data.access_token;
      console.log('Short-lived token received:', !!shortLivedToken);
    } catch (err: any) {
      console.error('Token exchange error:', err?.response?.data || err?.message);
      throw new BadRequestException('Token exchange failed: ' + JSON.stringify(err?.response?.data));
    }

    // Step 2: Exchange for long-lived token
    console.log('Step 2: Getting long-lived token...');
    let longLivedToken: string;
    try {
      const longLivedRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortLivedToken },
      });
      longLivedToken = longLivedRes.data.access_token;
      console.log('Long-lived token received:', !!longLivedToken);
    } catch (err: any) {
      console.error('Long-lived token error:', err?.response?.data || err?.message);
      throw new BadRequestException('Long-lived token failed');
    }

    // Step 3: Get Facebook Pages
    console.log('Step 3: Getting Facebook pages...');
    let pages: any[] = [];
    try {
      const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
        params: { access_token: longLivedToken },
      });
      pages = pagesRes.data.data || [];
      console.log('Pages found:', pages.length);
    } catch (err: any) {
      console.error('Pages fetch error:', err?.response?.data || err?.message);
      throw new BadRequestException('Failed to fetch pages');
    }

    const connectedAccounts: any[] = [];

    for (const page of pages) {
      console.log('Processing page:', page.name, page.id);

      const fbAccount = await this.prisma.socialAccount.upsert({
        where: { workspaceId_platform_accountId: { workspaceId, platform: 'FACEBOOK', accountId: page.id } },
        update: { accountName: page.name, accessToken: page.access_token, isActive: true },
        create: { workspaceId, platform: 'FACEBOOK', accountId: page.id, accountName: page.name, accessToken: page.access_token, isActive: true },
      });
      connectedAccounts.push(fbAccount);
      console.log('Facebook page saved:', fbAccount.id);

      // Check for Instagram
      try {
        const igRes = await axios.get(`https://graph.facebook.com/v19.0/${page.id}`, {
          params: { fields: 'instagram_business_account', access_token: page.access_token },
        });

        if (igRes.data.instagram_business_account) {
          const igId = igRes.data.instagram_business_account.id;
          const igDetailsRes = await axios.get(`https://graph.facebook.com/v19.0/${igId}`, {
            params: { fields: 'id,name,username,profile_picture_url', access_token: page.access_token },
          });
          const igDetails = igDetailsRes.data;
          console.log('Instagram found:', igDetails.username || igDetails.name);

          const igAccount = await this.prisma.socialAccount.upsert({
            where: { workspaceId_platform_accountId: { workspaceId, platform: 'INSTAGRAM', accountId: igId } },
            update: { accountName: igDetails.username || igDetails.name, accessToken: page.access_token, isActive: true },
            create: { workspaceId, platform: 'INSTAGRAM', accountId: igId, accountName: igDetails.username || igDetails.name, accessToken: page.access_token, isActive: true },
          });
          connectedAccounts.push(igAccount);
          console.log('Instagram saved:', igAccount.id);
        }
      } catch (igErr: any) {
        console.log('No Instagram for page:', page.name, igErr?.response?.data || igErr?.message);
      }
    }

    console.log('Total connected:', connectedAccounts.length);
    return { success: true, connectedAccounts, message: `Connected ${connectedAccounts.length} account(s)` };
  }

  async disconnectAccount(accountId: string, workspaceId: string) {
    await this.prisma.socialAccount.updateMany({
      where: { id: accountId, workspaceId },
      data: { isActive: false, accessToken: null },
    });
    return { success: true };
  }

  async getAccounts(workspaceId: string) {
    return this.prisma.socialAccount.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async publishToFacebook(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });
    if (!post || !post.socialAccount?.accessToken) throw new BadRequestException('Post or account not found');

    try {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${post.socialAccount.accountId}/feed`,
        { message: post.content, access_token: post.socialAccount.accessToken },
      );
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'PUBLISHED', externalId: res.data.id } });
      return { success: true, postId: res.data.id };
    } catch (err: any) {
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'FAILED' } });
      throw new BadRequestException(err.response?.data?.error?.message || 'Failed to publish');
    }
  }

  async publishToInstagram(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });
    if (!post || !post.socialAccount?.accessToken) throw new BadRequestException('Post or account not found');

    try {
      const mediaRes = await axios.post(
        `https://graph.facebook.com/v19.0/${post.socialAccount.accountId}/media`,
        null,
        { params: { caption: post.content, media_type: 'TEXT', access_token: post.socialAccount.accessToken } },
      );
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${post.socialAccount.accountId}/media_publish`,
        null,
        { params: { creation_id: mediaRes.data.id, access_token: post.socialAccount.accessToken } },
      );
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'PUBLISHED', externalId: publishRes.data.id } });
      return { success: true, postId: publishRes.data.id };
    } catch (err: any) {
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'FAILED' } });
      throw new BadRequestException(err.response?.data?.error?.message || 'Failed to publish to Instagram');
    }
  }

  getLinkedInAuthUrl(workspaceId: string, userId: string) {
    const clientId = this.config.get('LINKEDIN_CLIENT_ID');
    const redirectUri = this.config.get('LINKEDIN_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ workspaceId, userId })).toString('base64');
    const scopes = ['openid', 'profile', 'email', 'w_member_social'].join(' ');
    return {
      url: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`,
    };
  }

  async handleLinkedInCallback(code: string, state: string) {
    const clientId = this.config.get('LINKEDIN_CLIENT_ID');
    const clientSecret = this.config.get('LINKEDIN_CLIENT_SECRET');
    const redirectUri = this.config.get('LINKEDIN_REDIRECT_URI');

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
    let accessToken: string;
    try {
      const tokenRes = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      accessToken = tokenRes.data.access_token;
    } catch (err: any) {
      throw new BadRequestException('LinkedIn token exchange failed: ' + JSON.stringify(err?.response?.data));
    }

    // Get profile info
    let profile: any;
    try {
      const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      profile = profileRes.data;
    } catch (err: any) {
      throw new BadRequestException('Failed to fetch LinkedIn profile');
    }

    const accountId = profile.sub;
    const accountName = profile.name || `${profile.given_name} ${profile.family_name}`;

    const account = await this.prisma.socialAccount.upsert({
      where: { workspaceId_platform_accountId: { workspaceId, platform: 'LINKEDIN', accountId } },
      update: { accountName, accessToken, isActive: true },
      create: { workspaceId, platform: 'LINKEDIN', accountId, accountName, accessToken, isActive: true },
    });

    return { success: true, connectedAccounts: [account], message: 'LinkedIn connected successfully' };
  }

  async uploadImageToLinkedIn(imageUrl: string, accessToken: string, personUrn: string): Promise<string> {
    // Step 1: Register upload
    const registerRes = await axios.post(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: personUrn,
          serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' } }
    );

    const uploadUrl = registerRes.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const asset = registerRes.data.value.asset;

    // Step 2: Download image from Supabase and upload to LinkedIn
    const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    await axios.put(uploadUrl, imgRes.data, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'image/jpeg' },
    });

    return asset;
  }

  async publishToLinkedIn(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });
    if (!post || !post.socialAccount?.accessToken) throw new BadRequestException('Post or account not found');

    try {
      const personUrn = `urn:li:person:${post.socialAccount.accountId}`;
      const token = post.socialAccount.accessToken;

      // Upload images if any
      let shareMediaCategory = 'NONE';
      let media: any[] = [];
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        shareMediaCategory = 'IMAGE';
        for (const imageUrl of post.mediaUrls) {
          try {
            const asset = await this.uploadImageToLinkedIn(imageUrl, token, personUrn);
            media.push({ status: 'READY', media: asset });
          } catch (err: any) {
            this.logger.error('Failed to upload image to LinkedIn', err?.message);
          }
        }
      }

      const res = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: personUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: post.content },
              shareMediaCategory: media.length > 0 ? 'IMAGE' : 'NONE',
              ...(media.length > 0 && { media }),
            },
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' } }
      );
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'PUBLISHED', externalId: res.data.id } });
      return { success: true, postId: res.data.id };
    } catch (err: any) {
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'FAILED' } });
      throw new BadRequestException(err.response?.data?.message || 'Failed to publish to LinkedIn');
    }
  }

}