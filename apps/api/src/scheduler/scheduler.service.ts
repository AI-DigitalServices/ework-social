import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PlanGuardService } from '../common/plan-guard.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SocialService } from '../social/social.service';
import { PostHogService } from '../analytics/posthog.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
    private notifications: NotificationsService,
    private socialService: SocialService,
    private posthog: PostHogService,
  ) {}

  async getPosts(workspaceId: string) {
    return this.prisma.post.findMany({
      where: { workspaceId },
      include: { socialAccount: true, client: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Tenant-isolation guard for record-by-id routes that don't carry a
   * workspaceId. Confirms the post exists AND belongs to a workspace the
   * caller is a member of — otherwise throws NotFound (not Forbidden, so we
   * don't reveal that the record exists at all).
   */
  private async assertPostAccess(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, workspaceId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: post.workspaceId, userId },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Post not found');

    return post;
  }

  async createPost(dto: CreatePostDto) {
    // Plan gating — check post limit before creating
    await this.planGuard.checkPostLimit(dto.workspaceId);

    const post = await this.prisma.post.create({
      data: {
        workspaceId: dto.workspaceId,
        socialAccountId: dto.socialAccountId,
        content: dto.content,
        mediaUrls: dto.mediaUrls || [],
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        clientId: dto.clientId || null,
        status: dto.status as any,
      },
      include: { socialAccount: true, client: true },
    });

    this.posthog.capture(
      dto.workspaceId,
      dto.status === 'SCHEDULED' ? 'post_scheduled' : 'post_created',
      { platform: post.socialAccount?.platform, status: dto.status }
    );

    return post;
  }

  async updatePost(id: string, dto: Partial<CreatePostDto>, userId: string) {
    await this.assertPostAccess(id, userId);
    return this.prisma.post.update({
      where: { id },
      data: {
        content: dto.content,
        mediaUrls: dto.mediaUrls,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.status as any,
      },
      include: { socialAccount: true, client: true },
    });
  }

  async deletePost(id: string, userId: string) {
    await this.assertPostAccess(id, userId);
    return this.prisma.post.delete({ where: { id } });
  }

  async getAccounts(workspaceId: string) {
    return this.prisma.socialAccount.findMany({
      where: { workspaceId, isActive: true },
    });
  }

  // Runs every 2 minutes — processes due scheduled posts
  @Cron('*/2 * * * *')
  async processScheduledPosts() {
    this.logger.log('Cron tick — checking scheduled posts...');
    const now = new Date();
    const duePosts = await this.prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        workspace: {
          subscription: {
            OR: [
              // Active paid plan
              { status: 'ACTIVE', plan: { not: 'FREE' } },
              // Trial still active — trialEndsAt is in the future
              { status: 'TRIALING', trialEndsAt: { gt: now } },
            ],
          },
        },
      },
      include: {
        socialAccount: true,
        workspace: { include: { members: true } },
      },
      take: 50,
    });

    if (duePosts.length === 0) return;
    this.logger.log(`Processing ${duePosts.length} scheduled posts...`);

    for (const post of duePosts) {
      try {
        // Actually publish to platform
        const platform = post.socialAccount?.platform;
        if (platform === 'LINKEDIN') {
          await this.socialService.publishToLinkedIn(post.id);
        } else if (platform === 'INSTAGRAM') {
          await this.socialService.publishToInstagram(post.id);
        } else if (platform === 'FACEBOOK') {
          await this.socialService.publishToFacebook(post.id);
        } else if (platform === 'BLUESKY') {
          await this.socialService.publishToBluesky(post.id);
        } else if (platform === 'THREADS') {
          await this.socialService.publishToThreads(post.id);
        } else {
          await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'PUBLISHED', publishedAt: now },
          });
        }

        // Notify workspace owner
        const ownerId = post.workspace?.ownerId;
        if (ownerId) {
          await this.notifications.createNotification(
            ownerId,
            'post_published',
            '✅ Post published successfully',
            `Your post on ${post.socialAccount?.platform || 'social media'} was published.`,
            '/dashboard/scheduler'
          );
        }
        this.logger.log(`Post ${post.id} published successfully`);
      } catch (err) {
        this.logger.error(`Failed to publish post ${post.id}`, err);
        // Mark as failed
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: 'FAILED' },
        });
        // Notify owner of failure
        const ownerId = post.workspace?.ownerId;
        if (ownerId) {
          await this.notifications.createNotification(
            ownerId,
            'post_failed',
            '❌ Post failed to publish',
            `A scheduled post on ${post.socialAccount?.platform || 'social media'} failed. Please check and retry.`,
            '/dashboard/scheduler'
          );
        }
      }
    }
  }

  async retryPost(postId: string, userId: string) {
    await this.assertPostAccess(postId, userId);
    return this.prisma.post.update({
      where: { id: postId },
      data: { status: 'SCHEDULED' },
    });
  }


  async publishNow(postId: string, userId: string) {
    await this.assertPostAccess(postId, userId);
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });
    if (!post) throw new Error('Post not found');
    const platform = post.socialAccount?.platform;
    if (platform === 'INSTAGRAM') return this.socialService.publishToInstagram(postId);
    if (platform === 'FACEBOOK')  return this.socialService.publishToFacebook(postId);
    if (platform === 'LINKEDIN')  return this.socialService.publishToLinkedIn(postId);
    if (platform === 'THREADS')   return this.socialService.publishToThreads(postId);
    if (platform === 'BLUESKY')   return this.socialService.publishToBluesky(postId);
    // For platforms without a dedicated publisher (Twitter, TikTok, YouTube)
    // mark as published so the UI reflects the action
    return this.prisma.post.update({
      where: { id: postId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async getStats(workspaceId: string) {
    const [total, scheduled, published, failed, drafts] = await Promise.all([
      this.prisma.post.count({ where: { workspaceId } }),
      this.prisma.post.count({ where: { workspaceId, status: 'SCHEDULED' } }),
      this.prisma.post.count({ where: { workspaceId, status: 'PUBLISHED' } }),
      this.prisma.post.count({ where: { workspaceId, status: 'FAILED' } }),
      this.prisma.post.count({ where: { workspaceId, status: 'DRAFT' } }),
    ]);
    return { total, scheduled, published, failed, drafts };
  }

}