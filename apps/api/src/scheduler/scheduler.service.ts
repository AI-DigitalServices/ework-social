import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PlanGuardService } from '../common/plan-guard.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
    private notifications: NotificationsService,
  ) {}

  async getPosts(workspaceId: string) {
    return this.prisma.post.findMany({
      where: { workspaceId },
      include: { socialAccount: true, client: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPost(dto: CreatePostDto) {
    // Plan gating — check post limit before creating
    await this.planGuard.checkPostLimit(dto.workspaceId);

    return this.prisma.post.create({
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
  }

  async updatePost(id: string, dto: Partial<CreatePostDto>) {
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

  async deletePost(id: string) {
    return this.prisma.post.delete({ where: { id } });
  }

  async getAccounts(workspaceId: string) {
    return this.prisma.socialAccount.findMany({
      where: { workspaceId, isActive: true },
    });
  }

  // Runs every minute — processes due scheduled posts
  @Cron('* * * * *')
  async processScheduledPosts() {
    const now = new Date();
    const duePosts = await this.prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
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
        // Mark as published
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: 'PUBLISHED', publishedAt: now },
        });

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

  async retryPost(postId: string) {
    return this.prisma.post.update({
      where: { id: postId },
      data: { status: 'SCHEDULED' },
    });
  }

}