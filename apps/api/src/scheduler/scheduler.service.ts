import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class SchedulerService {
  constructor(private prisma: PrismaService) {}

  async getPosts(workspaceId: string) {
    return this.prisma.post.findMany({
      where: { workspaceId },
      include: {
        socialAccount: true,
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPost(dto: CreatePostDto) {
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
      include: {
        socialAccount: true,
        client: true,
      },
    });
  }

  async updatePost(id: string, dto: Partial<CreatePostDto>) {
    return this.prisma.post.update({
      where: { id },
      data: {
        content: dto.content,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.status as any,
      },
      include: { socialAccount: true, client: true },
    });
  }

  async deletePost(id: string) {
    return this.prisma.post.delete({ where: { id } });
  }

  async getSocialAccounts(workspaceId: string) {
    return this.prisma.socialAccount.findMany({
      where: { workspaceId },
    });
  }

  async createMockSocialAccount(workspaceId: string, platform: string, accountName: string) {
    return this.prisma.socialAccount.create({
      data: {
        workspaceId,
        platform: platform as any,
        accountName,
        accountId: `mock_${Date.now()}`,
        accessToken: `mock_token_${Date.now()}`,
      },
    });
  }
}
