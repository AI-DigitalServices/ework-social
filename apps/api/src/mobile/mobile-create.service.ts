import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { AiService } from '../ai/ai.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { IDEA_PLATFORMS, charLimit, clean } from '../ai/idea-prompt';
import { CATEGORIES } from './onboarding-options';
import { toPostSummary } from './mobile-posts.util';
import axios from 'axios';
import { isOwnMediaUrl } from './media-url.util';

const SHELF_CAP = 100;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Video from the app goes to these platforms; YouTube and TikTok only take video.
const VIDEO_PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'TIKTOK'];
const VIDEO_ONLY_PLATFORMS = ['YOUTUBE', 'TIKTOK'];
const isVideoUrl = (u: string) => /\.(mp4|mov)$/i.test(u);
const nameOf = (p: string) => (p === 'TWITTER' ? 'X' : p.charAt(0) + p.slice(1).toLowerCase());

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

  async suggest(workspaceId: string, dto: { idea: string; platform?: string; imageUrl?: string; hint?: string; imageKind?: string }) {
    const idea = clean(dto.idea, 600);
    if (idea.length < 3) throw new BadRequestException('Tell us a little more about your idea.');
    await this.planGuard.assertCanWrite(workspaceId);

    let image: { mediaType: string; data: string } | undefined;
    if (dto.imageUrl) {
      if (!isOwnMediaUrl(dto.imageUrl, workspaceId)) {
        throw new BadRequestException('That photo could not be used. Please choose it again.');
      }
      image = await this.loadImage(dto.imageUrl);
    }

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
      image,
      hint: dto.hint,
      photoKind: dto.imageKind,
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
    const usage = await this.usageOf(workspaceId);
    return { platform, options, usage };
  }

  async saveIdea(
    workspaceId: string,
    userId: string,
    dto: { idea: string; content: string; platform?: string; mediaUrls?: string[] },
  ) {
    const content = String(dto.content ?? '').trim();
    if (!content) throw new BadRequestException('There is no text to save.');
    const mediaUrls = (dto.mediaUrls ?? []).slice(0, 4);
    if (mediaUrls.some((u) => !isOwnMediaUrl(u, workspaceId))) {
      throw new BadRequestException('That photo could not be used. Please choose it again.');
    }
    const open = await this.prisma.postIdea.count({ where: { workspaceId, usedPostId: null } });
    if (open >= SHELF_CAP) {
      throw new BadRequestException('Your ideas shelf is full. Use or delete a few first.');
    }
    const videos = mediaUrls.filter(isVideoUrl);
    if (videos.length > 0) {
      if (mediaUrls.length > 1) throw new BadRequestException('A video post has one video and nothing else.');
      // Uses one video from the plan's monthly allowance (throws a plain message when none are left).
      await this.ai.consumeVideo(workspaceId);
    }
    const row = await this.prisma.postIdea.create({
      data: {
        workspaceId,
        idea: clean(dto.idea, 600),
        content,
        platform: normalizePlatform(dto.platform),
        mediaUrls,
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

    const media: string[] = (idea as any).mediaUrls ?? [];
    const hasVideo = media.some(isVideoUrl);
    const wrong = found.find((a: any) =>
      hasVideo ? !VIDEO_PLATFORMS.includes(String(a.platform)) : VIDEO_ONLY_PLATFORMS.includes(String(a.platform)),
    );
    if (wrong) {
      const name = nameOf(String((wrong as any).platform));
      throw new BadRequestException(
        hasVideo
          ? `${name} cannot take a video from the app yet. Choose Instagram, Facebook, YouTube or TikTok.`
          : `${name} needs a video. Start a post from a video to use it.`,
      );
    }
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
            mediaUrls: (idea as any).mediaUrls ?? [],
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

  /** AI writes used and left this month, for the (?) next to the AI actions. */
  async usage(workspaceId: string) {
    return (await this.usageOf(workspaceId)) ?? { used: 0, limit: 0, remaining: 0, trial: false, resets: null };
  }

  /** Videos posted from the app this month and the plan's allowance, for the video picker. */
  async videoUsage(workspaceId: string) {
    try {
      return await this.ai.videoUsage(workspaceId);
    } catch {
      return { used: 0, limit: 0, remaining: 0, trial: false, resets: null };
    }
  }

  // Never let a usage lookup break writing a post.
  private async usageOf(workspaceId: string) {
    try {
      return await this.ai.ideaUsage(workspaceId);
    } catch {
      return null;
    }
  }

  /** Downloads the owner's photo from our own storage so Claude can look at it. */
  private async loadImage(url: string): Promise<{ mediaType: string; data: string }> {
    try {
      const res = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxContentLength: MAX_IMAGE_BYTES,
        maxRedirects: 0,
      });
      const type = String(res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const buf = Buffer.from(res.data);
      if (!IMAGE_TYPES.includes(type) || buf.length === 0 || buf.length > MAX_IMAGE_BYTES) throw new Error('bad image');
      return { mediaType: type, data: buf.toString('base64') };
    } catch {
      throw new BadRequestException('We could not read that photo. Try a smaller JPG or PNG.');
    }
  }

  private shape(r: any) {
    return {
      id: r.id,
      idea: r.idea,
      content: r.content,
      platform: r.platform ?? null,
      mediaUrls: r.mediaUrls ?? [],
      createdAt: r.createdAt,
    };
  }
}
