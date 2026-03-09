import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PlanGuardService } from '../common/plan-guard.service';

@Injectable()
export class SchedulerService {
  constructor(
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
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
}
