import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { BskyAgent, RichText } from '@atproto/api';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  // Encrypt token before saving to database
  private encryptToken(token: string): string {
    const key = Buffer.from(this.config.get<string>('ENCRYPTION_KEY')!, 'hex');
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt token after reading from database
  private decryptToken(encryptedToken: string): string {
    try {
      const [ivHex, encrypted] = encryptedToken.split(':');
      if (!ivHex || !encrypted) return encryptedToken; // return as-is if not encrypted format
      const key = Buffer.from(this.config.get<string>('ENCRYPTION_KEY')!, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    } catch {
      // If decryption fails, return original (handles legacy unencrypted tokens)
      return encryptedToken;
    }
  }

  getFacebookAuthUrl(workspaceId: string, userId: string) {
    const appId = this.config.get('META_APP_ID');
    const redirectUri = this.config.get('META_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ workspaceId, userId })).toString('base64');

    const scopes = [
      'public_profile',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
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
        update: { accountName: page.name, accessToken: this.encryptToken(page.access_token), isActive: true },
        create: { workspaceId, platform: 'FACEBOOK', accountId: page.id, accountName: page.name, accessToken: this.encryptToken(page.access_token), isActive: true },
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
            update: { accountName: igDetails.username || igDetails.name, accessToken: this.encryptToken(page.access_token), isActive: true },
            create: { workspaceId, platform: 'INSTAGRAM', accountId: igId, accountName: igDetails.username || igDetails.name, accessToken: this.encryptToken(page.access_token), isActive: true },
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
      const accessToken = this.decryptToken(post.socialAccount.accessToken);
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${post.socialAccount.accountId}/feed`,
        { message: post.content, access_token: accessToken },
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
    if (!post || !post.socialAccount?.accessToken) {
      throw new BadRequestException('Post or account not found');
    }

    // Instagram requires at least one image — text-only posts are not supported
    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'FAILED', errorMessage: 'Instagram requires at least one image. Text-only posts are not supported.' },
      });
      throw new BadRequestException('Instagram requires at least one image. Text-only posts are not supported.');
    }

    try {
      const imageUrl = post.mediaUrls[0];
      const accountId = post.socialAccount.accountId;
      const accessToken = this.decryptToken(post.socialAccount.accessToken);

      // Step 1: Create media container with image
      const mediaRes = await axios.post(
        `https://graph.facebook.com/v19.0/${accountId}/media`,
        null,
        {
          params: {
            caption: post.content,
            media_type: 'IMAGE',
            image_url: imageUrl,
            access_token: accessToken,
          },
        },
      );

      const creationId = mediaRes.data.id;
      if (!creationId) {
        throw new Error('No creation ID returned from Instagram');
      }

      // Step 2: Publish the media container
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: accessToken,
          },
        },
      );

      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED', externalId: publishRes.data.id },
      });
      return { success: true, postId: publishRes.data.id };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to publish to Instagram';
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'FAILED', errorMessage },
      });
      throw new BadRequestException(errorMessage);
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
      update: { accountName, accessToken: this.encryptToken(accessToken), isActive: true },
      create: { workspaceId, platform: 'LINKEDIN', accountId, accountName, accessToken: this.encryptToken(accessToken), isActive: true },
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
      const token = this.decryptToken(post.socialAccount.accessToken);

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


  getYouTubeAuthUrl(workspaceId: string, userId: string) {
    const clientId = this.config.get('YOUTUBE_CLIENT_ID');
    const redirectUri = this.config.get('YOUTUBE_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ workspaceId, userId })).toString('base64');
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code&access_type=offline&prompt=consent`,
    };
  }

  async handleYouTubeCallback(code: string, state: string) {
    const clientId = this.config.get('YOUTUBE_CLIENT_ID');
    const clientSecret = this.config.get('YOUTUBE_CLIENT_SECRET');
    const redirectUri = this.config.get('YOUTUBE_REDIRECT_URI');

    let workspaceId: string;
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      workspaceId = decoded.workspaceId;
      userId = decoded.userId;
    } catch {
      throw new BadRequestException('Invalid state parameter');
    }

    // Exchange code for tokens
    let accessToken: string;
    let refreshToken: string;
    try {
      const tokenRes = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      accessToken = tokenRes.data.access_token;
      refreshToken = tokenRes.data.refresh_token;
    } catch (err: any) {
      throw new BadRequestException('YouTube token exchange failed: ' + JSON.stringify(err?.response?.data));
    }

    // Get channel info
    let channelName = 'YouTube Channel';
    let channelId = userId;
    try {
      const channelRes = await axios.get(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const channel = channelRes.data.items?.[0];
      if (channel) {
        channelName = channel.snippet.title;
        channelId = channel.id;
      }
    } catch (err) {
      this.logger.error('Failed to fetch YouTube channel', err);
    }

    const account = await this.prisma.socialAccount.upsert({
      where: { workspaceId_platform_accountId: { workspaceId, platform: 'YOUTUBE', accountId: channelId } },
      update: { accountName: channelName, accessToken: this.encryptToken(accessToken), refreshToken: this.encryptToken(refreshToken), isActive: true },
      create: { workspaceId, platform: 'YOUTUBE', accountId: channelId, accountName: channelName, accessToken: this.encryptToken(accessToken), refreshToken: this.encryptToken(refreshToken), isActive: true },
    });

    return { success: true, connectedAccounts: [account], message: 'YouTube connected successfully' };
  }

  // Refresh YouTube access token using stored refresh token
  private async refreshYouTubeToken(accountId: string): Promise<string> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });
    if (!account?.refreshToken) throw new BadRequestException('No refresh token available for YouTube account');

    const decryptedRefreshToken = this.decryptToken(account.refreshToken);

    try {
      const tokenRes = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: this.config.get('YOUTUBE_CLIENT_ID')!,
          client_secret: this.config.get('YOUTUBE_CLIENT_SECRET')!,
          refresh_token: decryptedRefreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const newAccessToken = tokenRes.data.access_token;

      // Save the new encrypted access token
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: { accessToken: this.encryptToken(newAccessToken) },
      });

      return newAccessToken;
    } catch (err: any) {
      throw new BadRequestException('Failed to refresh YouTube token: ' + JSON.stringify(err?.response?.data));
    }
  }

  async publishToYouTube(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });
    if (!post || !post.socialAccount?.accessToken) throw new BadRequestException('Post or account not found');

    const videoUrl = post.mediaUrls?.find((url: string) => url.match(/\.(mp4|mov|avi|webm)$/i));
    if (!videoUrl) throw new BadRequestException('YouTube posts require a video file');

    try {
      // Always refresh YouTube token before publishing — expires in 1 hour
      let accessToken: string;
      try {
        accessToken = await this.refreshYouTubeToken(post.socialAccount.id);
      } catch {
        // Fall back to decrypting stored token if refresh fails
        accessToken = this.decryptToken(post.socialAccount.accessToken);
      }

      // Download video from Supabase
      const videoRes = await axios.get(videoUrl, { responseType: 'stream' });

      // Upload to YouTube
      const uploadRes = await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          snippet: {
            title: post.content.slice(0, 100),
            description: post.content,
            categoryId: '22',
          },
          status: { privacyStatus: 'public' },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': 'video/mp4',
          },
        }
      );

      const uploadUrl = uploadRes.headers.location;
      const finalRes = await axios.put(uploadUrl, videoRes.data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'video/mp4',
        },
      });

      const videoId = finalRes.data.id;
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED', externalId: videoId },
      });
      return { success: true, videoId, url: `https://youtube.com/watch?v=${videoId}` };
    } catch (err: any) {
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'FAILED' } });
      throw new BadRequestException(err?.response?.data?.error?.message || 'Failed to publish to YouTube');
    }
  }


  getTikTokAuthUrl(workspaceId: string, userId: string) {
    const clientKey = this.config.get('TIKTOK_CLIENT_KEY');
    const redirectUri = this.config.get('TIKTOK_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ workspaceId, userId })).toString('base64');
    const scopes = 'user.info.basic,video.publish,video.upload';
    return {
      url: `https://www.tiktok.com/v2/auth/authorize?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code`,
    };
  }

  async handleTikTokCallback(code: string, state: string) {
    const clientKey = this.config.get('TIKTOK_CLIENT_KEY');
    const clientSecret = this.config.get('TIKTOK_CLIENT_SECRET');
    const redirectUri = this.config.get('TIKTOK_REDIRECT_URI');
    let workspaceId: string;
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      workspaceId = decoded.workspaceId;
      userId = decoded.userId;
    } catch {
      throw new BadRequestException('Invalid state parameter');
    }
    let accessToken: string;
    let openId: string;
    try {
      const tokenRes = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      accessToken = tokenRes.data.access_token;
      openId = tokenRes.data.open_id;
    } catch (err: any) {
      throw new BadRequestException('TikTok token exchange failed: ' + JSON.stringify(err?.response?.data));
    }
    let displayName = 'TikTok User';
    try {
      const userRes = await axios.get(
        'https://open.tiktokapis.com/v2/user/info/?fields=display_name',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      displayName = userRes.data?.data?.user?.display_name || displayName;
    } catch (err) {
      this.logger.error('Failed to fetch TikTok user info', err);
    }
    const account = await this.prisma.socialAccount.upsert({
      where: { workspaceId_platform_accountId: { workspaceId, platform: 'TIKTOK', accountId: openId } },
      update: { accountName: displayName, accessToken, isActive: true },
      create: { workspaceId, platform: 'TIKTOK', accountId: openId, accountName: displayName, accessToken, isActive: true },
    });
    return { success: true, connectedAccounts: [account], message: 'TikTok connected successfully' };
  }

  async publishToTikTok(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });
    if (!post || !post.socialAccount?.accessToken) throw new BadRequestException('Post or account not found');
    const videoUrl = post.mediaUrls?.find((url: string) => url.match(/\.(mp4|mov|avi|webm)$/i));
    if (!videoUrl) throw new BadRequestException('TikTok posts require a video file');
    try {
      const initRes = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          post_info: {
            title: post.content.slice(0, 150),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: { source: 'URL', video_url: videoUrl },
        },
        { headers: { Authorization: `Bearer ${post.socialAccount.accessToken}`, 'Content-Type': 'application/json' } }
      );
      const publishId = initRes.data?.data?.publish_id;
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'PUBLISHED', externalId: publishId } });
      return { success: true, publishId };
    } catch (err: any) {
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'FAILED' } });
      throw new BadRequestException(err?.response?.data?.error?.message || 'Failed to publish to TikTok');
    }
  }


  async connectBluesky(workspaceId: string, identifier: string, appPassword: string) {
    try {
      const agent = new BskyAgent({ service: 'https://bsky.social' });
      await agent.login({ identifier, password: appPassword });
      const profile = agent.session;
      if (!profile) throw new Error('Login failed');
      const account = await this.prisma.socialAccount.upsert({
        where: { workspaceId_platform_accountId: { workspaceId, platform: 'BLUESKY', accountId: profile.did } },
        update: { accountName: profile.handle, accessToken: this.encryptToken(appPassword), refreshToken: this.encryptToken(identifier), isActive: true },
        create: { workspaceId, platform: 'BLUESKY', accountId: profile.did, accountName: profile.handle, accessToken: this.encryptToken(appPassword), refreshToken: this.encryptToken(identifier), isActive: true },
      });
      return { success: true, connectedAccounts: [account], message: `Connected @${profile.handle} on Bluesky` };
    } catch (err: any) {
      throw new Error('Bluesky login failed: ' + (err?.message || 'Invalid credentials'));
    }
  }

  async publishToBluesky(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });
    if (!post || !post.socialAccount?.accessToken) throw new Error('Post or account not found');
    try {
      const appPassword = this.decryptToken(post.socialAccount.accessToken);
      const identifier = this.decryptToken(post.socialAccount.refreshToken!);
      const agent = new BskyAgent({ service: 'https://bsky.social' });
      await agent.login({ identifier, password: appPassword });
      const rt = new RichText({ text: post.content });
      await rt.detectFacets(agent);
      const postData: any = { text: rt.text, facets: rt.facets, createdAt: new Date().toISOString() };
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        const images = [];
        for (const imageUrl of post.mediaUrls.slice(0, 4)) {
          try {
            const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imgRes.data);
            const mimeType = imageUrl.match(/\.png$/i) ? 'image/png' : 'image/jpeg';
            const { data: blob } = await agent.uploadBlob(buffer, { encoding: mimeType });
            images.push({ image: blob.blob, alt: post.content.slice(0, 100) });
          } catch (imgErr) {
            this.logger.error('Failed to upload image to Bluesky', imgErr);
          }
        }
        if (images.length > 0) {
          postData.embed = { $type: 'app.bsky.embed.images', images };
        }
      }
      const response = await agent.post(postData);
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'PUBLISHED', externalId: response.uri } });
      return { success: true, postId: response.uri };
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to publish to Bluesky';
      await this.prisma.post.update({ where: { id: postId }, data: { status: 'FAILED', errorMessage } });
      throw new Error(errorMessage);
    }
  }


  getThreadsAuthUrl(workspaceId: string, userId: string) {
    const appId = this.config.get('META_APP_ID');
    const redirectUri = this.config.get('THREADS_REDIRECT_URI') || 
      this.config.get('META_REDIRECT_URI')?.replace('facebook', 'threads');
    const state = Buffer.from(JSON.stringify({ workspaceId, userId })).toString('base64');
    const scopes = ['threads_basic', 'threads_content_publish'].join(',');
    return {
      url: `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`,
    };
  }

  async handleThreadsCallback(code: string, state: string) {
    const appId = this.config.get('META_APP_ID');
    const appSecret = this.config.get('META_APP_SECRET');
    const redirectUri = this.config.get('THREADS_REDIRECT_URI') ||
      this.config.get('META_REDIRECT_URI')?.replace('facebook', 'threads');

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
    let threadUserId: string;
    try {
      const tokenRes = await axios.post(
        'https://graph.threads.net/oauth/access_token',
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      accessToken = tokenRes.data.access_token;
      threadUserId = tokenRes.data.user_id;
    } catch (err: any) {
      throw new BadRequestException('Threads token exchange failed: ' + JSON.stringify(err?.response?.data));
    }

    // Get long-lived token
    let longLivedToken: string;
    try {
      const llRes = await axios.get('https://graph.threads.net/access_token', {
        params: {
          grant_type: 'th_exchange_token',
          client_secret: appSecret,
          access_token: accessToken,
        },
      });
      longLivedToken = llRes.data.access_token;
    } catch {
      longLivedToken = accessToken;
    }

    // Get profile info
    let username = 'Threads User';
    try {
      const profileRes = await axios.get(`https://graph.threads.net/v1.0/${threadUserId}`, {
        params: { fields: 'id,username,name', access_token: longLivedToken },
      });
      username = profileRes.data.username || profileRes.data.name || username;
    } catch (err) {
      this.logger.error('Failed to fetch Threads profile', err);
    }

    const account = await this.prisma.socialAccount.upsert({
      where: { workspaceId_platform_accountId: { workspaceId, platform: 'THREADS', accountId: threadUserId } },
      update: { accountName: username, accessToken: this.encryptToken(longLivedToken), isActive: true },
      create: { workspaceId, platform: 'THREADS', accountId: threadUserId, accountName: username, accessToken: this.encryptToken(longLivedToken), isActive: true },
    });

    return { success: true, connectedAccounts: [account], message: `Connected @${username} on Threads` };
  }

  async publishToThreads(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });
    if (!post || !post.socialAccount?.accessToken) throw new BadRequestException('Post or account not found');

    try {
      const accessToken = this.decryptToken(post.socialAccount.accessToken);
      const userId = post.socialAccount.accountId;

      // Step 1: Create media container
      const params: any = {
        media_type: 'TEXT',
        text: post.content,
        access_token: accessToken,
      };

      if (post.mediaUrls && post.mediaUrls.length > 0) {
        params.media_type = 'IMAGE';
        params.image_url = post.mediaUrls[0];
      }

      const containerRes = await axios.post(
        `https://graph.threads.net/v1.0/${userId}/threads`,
        null,
        { params }
      );

      const creationId = containerRes.data.id;

      // Step 2: Publish container
      const publishRes = await axios.post(
        `https://graph.threads.net/v1.0/${userId}/threads_publish`,
        null,
        { params: { creation_id: creationId, access_token: accessToken } }
      );

      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED', externalId: publishRes.data.id },
      });

      return { success: true, postId: publishRes.data.id };
    } catch (err: any) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'FAILED', errorMessage: err?.response?.data?.error?.message || 'Failed to publish to Threads' },
      });
      throw new BadRequestException(err?.response?.data?.error?.message || 'Failed to publish to Threads');
    }
  }

}