import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { AiService } from '../ai/ai.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { IDEA_PLATFORMS, charLimit, clean } from '../ai/idea-prompt';
import { CATEGORIES } from './onboarding-options';
import { toPostSummary } from './mobile-posts.util';

const SHELF_CAP = 100;

function normalizePlatform(p?: string | null): string | null {
  const v = String(p ?? '').trim().toUpperCase();
  return IDEA_PLATFORMS.includes(v) ? v : null;
}

/**
 * "Give us an idea" for the app: one sentence in, three posts out, written in the business's saved
 * voice. Chosen posts are kept on an ideas shelf, so a brand-new business (no connected account yet)
 * still ends setup with something real. An idea becomes a post once an account is connected.
 */
@Injectable()
export class MobileCreateService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private scheduler: SchedulerService,
    private planGuard: PlanGuardService,
  ) {}

  async suggest(workspaceId: string, dto: { idea: string; platform?: string }) {
    const idea = clean(dto.idea, 600);
    if (idea.length < 3) throw new BadRequestException('Tell us a little more about your idea.');
    await this.planGuard.assertCanWrite(workspaceId);

    const [workspace, profile] = await Promise.all([
      this.prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      this.prisma.workspaceProfile.findUnique({ where: { workspaceId } }),
    ]);

    const platform = normalizePlatform(dto.platform) ?? normalizePlatform(profile?.platforms?.[0]) ?? 'INSTAGRAM';
    const category = CATEGORIES.find((c) => c.id === profile?.category) ?? null;
    const tone = profile?.tone ?? null;

    const { options } = await this.ai.generateFromIdea(workspaceId, {
      idea,
      platform,
      business: {
        name: workspace?.name ?? '',
        category: category?.label ?? null,
        description: profile?.description ?? null,
        audience: profile?.audience ?? null,
        offerings: profile?.offerings ?? [],
        tone,
        language: profile?.language ?? null,
        contentTypes: profile?.contentTypes ?? [],
        toneSample: tone ? ((category?.toneSamples as Record<string, string> | undefined)?.[tone] ?? null) : null,
      },
    });
    return { platform, options };
  }

  async saveIdea(workspaceId: string, userId: string, dto: { idea: string; content: string; platform?: string }) {
    const content = String(dto.content ?? '').trim();
    if (!content) throw new BadRequestException('There is no text to save.');
    const open = await this.prisma.postIdea.count({ where: { workspaceId, usedPostId: null } });
    if (open >= SHELF_CAP) {
      throw new BadRequestException('Your ideas shelf is full. Use or delete a few first.');
    }
    const row = await this.prisma.postIdea.create({
      data: {
        workspaceId,
        idea: clean(dto.idea, 600),
        content,
        platform: normalizePlatform(dto.platform),
        createdById: userId,
      },
    });
    return this.shape(row);
  }

  async listIdeas(workspaceId: string) {
    const rows = await this.prisma.postIdea.findMany({
      where: { workspaceId, usedPostId: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items: rows.map((r: any) => this.shape(r)) };
  }

  /** Change the text of an idea that is still on the shelf. */
  async updateIdea(workspaceId: string, id: string, content: string) {
    const text = String(content ?? '').trim();
    if (!text) throw new BadRequestException('There is no text to save.');
    const r = await this.prisma.postIdea.updateMany({
      where: { id, workspaceId, usedPostId: null },
      data: { content: text },
    });
    if (r.count === 0) throw new NotFoundException('That idea no longer exists.');
    const row = await this.prisma.postIdea.findFirst({ where: { id, workspaceId } });
    if (!row) throw new NotFoundException('That idea no longer exists.');
    return this.shape(row);
  }

  async removeIdea(workspaceId: string, id: string) {
    const r = await this.prisma.postIdea.deleteMany({ where: { id, workspaceId, usedPostId: null } });
    if (r.count === 0) throw new NotFoundException('That idea no longer exists.');
    return { ok: true };
  }

  /**
   * Turn a saved idea into real posts: one draft or scheduled post for each chosen account, all with the same
   * text and time. Every account is checked before anything is created. If some accounts fail (for example the
   * plan's post limit), the rest still go through and the failures are returned.
   */
  async ideaToPost(
    workspaceId: string,
    userId: string,
    id: string,
    dto: { socialAccountId?: string; socialAccountIds?: string[]; status: 'DRAFT' | 'SCHEDULED'; scheduledAt?: string },
  ) {
    const idea = await this.prisma.postIdea.findFirst({ where: { id, workspaceId } });
    if (!idea) throw new NotFoundException('That idea no longer exists.');
    if (idea.usedPostId) throw new ConflictException('This idea is already a post.');

    const ids = Array.from(new Set([...(dto.socialAccountIds ?? []), ...(dto.socialAccountId ? [dto.socialAccountId] : [])]));
    if (ids.length === 0) throw new BadRequestException('Choose at least one account.');
    if (ids.length > 10) throw new BadRequestException('Choose up to 10 accounts at a time.');

    let scheduledAt: string | undefined;
    if (dto.status === 'SCHEDULED') {
      const when = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
      if (!when || Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) {
        throw new BadRequestException('Pick a time in the future.');
      }
      scheduledAt = when.toISOString();
    }

    const found = await this.prisma.socialAccount.findMany({
      where: { id: { in: ids }, workspaceId, isActive: true },
      select: { id: true, platform: true },
    });
    if (found.length !== ids.length) throw new BadRequestException('Choose your connected accounts.');
    const byId = new Map<string, { id: string; platform: any }>(found.map((a: any): [string, any] => [a.id, a]));

    const tooLong = found.find((a: any) => idea.content.length > charLimit(String(a.platform)));
    if (tooLong) {
      const p = String(tooLong.platform);
      throw new BadRequestException(`This text is too long for ${p.charAt(0)}${p.slice(1).toLowerCase()}. Shorten it first.`);
    }

    const member = await this.prisma.workspaceMember.findFirst({ where: { workspaceId, userId }, select: { role: true } });

    // Claim the idea first so two quick taps cannot create the posts twice.
    const claim = await this.prisma.postIdea.updateMany({
      where: { id, workspaceId, usedPostId: null },
      data: { usedPostId: 'pending' },
    });
    if (claim.count === 0) throw new ConflictException('This idea is already a post.');

    const posts: any[] = [];
    const failed: { accountId: string; platform: string; message: string }[] = [];
    let firstError: unknown = null;
    for (const accountId of ids) {
      const account = byId.get(accountId)!;
      try {
        const post: any = await this.scheduler.createPost(
          {
            workspaceId,
            socialAccountId: account.id,
            content: idea.content,
            mediaUrls: [],
            ...(scheduledAt ? { scheduledAt } : {}),
            status: dto.status,
          } as any,
          member?.role,
        );
        posts.push(post);
      } catch (err: any) {
        firstError = firstError ?? err;
        failed.push({ accountId, platform: String(account.platform), message: err?.message || 'Could not create the post.' });
      }
    }

    if (posts.length === 0) {
      await this.prisma.postIdea.updateMany({ where: { id, usedPostId: 'pending' }, data: { usedPostId: null } });
      throw firstError;
    }
    await this.prisma.postIdea.update({ where: { id }, data: { usedPostId: posts[0].id } });
    return { post: toPostSummary(posts[0]), posts: posts.map((p) => toPostSummary(p)), failed };
  }

  private shape(r: any) {
    return {
      id: r.id,
      idea: r.idea,
      content: r.content,
      platform: r.platform ?? null,
      createdAt: r.createdAt,
    };
  }
}
