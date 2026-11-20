import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import {
  APPROVAL_STATUSES,
  POST_STATUSES,
  canWrite,
  isFresh,
  isPublishable,
  isRetryable,
  toPostSummary,
} from './mobile-posts.util';
import { charLimit } from '../ai/idea-prompt';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const POST_SELECT = {
  id: true,
  workspaceId: true,
  content: true,
  mediaUrls: true,
  status: true,
  scheduledAt: true,
  publishedAt: true,
  errorMessage: true,
  updatedAt: true,
  socialAccount: { select: { platform: true, accountName: true } },
} as const;

/**
 * Post lists and actions for the app.
 *
 * Stricter than the web scheduler routes on purpose: acting on a post needs an
 * editor-or-above role, a workspace that is not read-only, a status that makes
 * sense, and a fresh view of the post (the app sends the updatedAt it saw; a
 * mismatch means someone changed it, answered with 409). The claim step is
 * compare-and-set, so two quick taps cannot publish twice.
 */
@Injectable()
export class MobilePostsService {
  constructor(
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
    private scheduler: SchedulerService,
  ) {}

  // ── Reads ─────────────────────────────────────────────────────────────────

  async listPosts(workspaceId: string, status?: string, cursor?: string, limitRaw?: string) {
    if (status && !(POST_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(`status must be one of: ${POST_STATUSES.join(', ')}.`);
    }
    const parsed = parseInt(limitRaw ?? '', 10);
    const limit = Math.min(Math.max(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT, 1), MAX_LIMIT);

    if (cursor) {
      const ok = await this.prisma.post.findFirst({ where: { id: cursor, workspaceId }, select: { id: true } });
      if (!ok) throw new BadRequestException('Invalid cursor.');
    }

    const rows = await this.prisma.post.findMany({
      where: { workspaceId, ...(status ? { status: status as any } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: POST_SELECT,
    });

    const page = rows.slice(0, limit);
    return {
      items: page.map(toPostSummary),
      nextCursor: rows.length > limit && page.length > 0 ? page[page.length - 1].id : null,
    };
  }

  async getPost(postId: string, userId: string) {
    const { post, role } = await this.loadPost(postId, userId);
    const approval = await this.prisma.postApproval.findUnique({
      where: { postId },
      select: { status: true, clientName: true, revisionNote: true, respondedAt: true },
    });
    return {
      ...toPostSummary(post),
      content: post.content, // full text on the detail screen
      mediaUrls: post.mediaUrls,
      approval: approval ?? null,
      canEdit: canWrite(role),
    };
  }

  /** Approvals for the workspace. The client's private review-link token is never included. */
  async listApprovals(workspaceId: string, status?: string) {
    if (status && !(APPROVAL_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(`status must be one of: ${APPROVAL_STATUSES.join(', ')}.`);
    }
    const rows = await this.prisma.postApproval.findMany({
      where: { workspaceId, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        clientName: true,
        clientEmail: true,
        revisionNote: true,
        emailSentAt: true,
        respondedAt: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            content: true,
            scheduledAt: true,
            status: true,
            updatedAt: true,
            socialAccount: { select: { platform: true, accountName: true } },
          },
        },
      },
    });
    return {
      items: rows.map((a: any) => ({
        id: a.id,
        status: a.status,
        clientName: a.clientName,
        clientEmail: a.clientEmail,
        revisionNote: a.revisionNote ?? null,
        sentAt: a.emailSentAt ?? a.createdAt,
        respondedAt: a.respondedAt ?? null,
        post: a.post ? toPostSummary(a.post) : null,
      })),
    };
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async publishNow(postId: string, userId: string, expectedUpdatedAt: string) {
    const { post, role } = await this.loadPost(postId, userId);
    this.assertMayWrite(role);
    await this.planGuard.assertCanWrite(post.workspaceId);
    this.assertFresh(post, expectedUpdatedAt);

    if (post.status === 'PENDING_APPROVAL') {
      throw new BadRequestException('This post is waiting for client approval and cannot be published yet.');
    }
    if (!isPublishable(post.status)) {
      throw new BadRequestException('This post is already published.');
    }

    await this.claim(post, { errorMessage: null });

    try {
      await this.scheduler.publishNow(post.id, userId);
    } catch (err: any) {
      throw new BadRequestException({
        code: 'PUBLISH_FAILED',
        message: `Publishing failed: ${err?.message || 'unknown error'}`,
        post: await this.summary(post.id),
      });
    }
    return { ok: true, post: await this.summary(post.id) };
  }

  async retry(postId: string, userId: string, expectedUpdatedAt: string) {
    const { post, role } = await this.loadPost(postId, userId);
    this.assertMayWrite(role);
    await this.planGuard.assertCanWrite(post.workspaceId);
    this.assertFresh(post, expectedUpdatedAt);

    if (!isRetryable(post.status)) {
      throw new BadRequestException('Only failed posts can be retried.');
    }
    await this.claim(post, { status: 'SCHEDULED' as any, errorMessage: null });
    return { ok: true, post: await this.summary(post.id) };
  }

  /**
   * Change the text and/or the time of a draft, scheduled or failed post.
   * Choosing a time schedules it; choosing DRAFT unschedules it.
   */
  async editPost(
    postId: string,
    userId: string,
    dto: { expectedUpdatedAt: string; content?: string; status?: 'DRAFT' | 'SCHEDULED'; scheduledAt?: string },
  ) {
    const { post, role } = await this.loadPost(postId, userId);
    this.assertMayWrite(role);
    await this.planGuard.assertCanWrite(post.workspaceId);
    this.assertFresh(post, dto.expectedUpdatedAt);

    if (post.status === 'PUBLISHED') throw new BadRequestException('A published post cannot be changed.');
    if (post.status === 'PENDING_APPROVAL') {
      throw new BadRequestException('This post is waiting for client approval and cannot be changed.');
    }
    if (dto.content === undefined && dto.status === undefined && dto.scheduledAt === undefined) {
      throw new BadRequestException('Nothing to change.');
    }

    const data: Record<string, unknown> = {};

    if (dto.content !== undefined) {
      const content = dto.content.trim();
      if (!content) throw new BadRequestException('Write something first.');
      const platform = String((post as any).socialAccount?.platform ?? '');
      if (content.length > charLimit(platform)) {
        throw new BadRequestException(
          `This text is too long for ${platform.charAt(0)}${platform.slice(1).toLowerCase()}. Shorten it first.`,
        );
      }
      data.content = content;
    }

    const nextStatus: string = dto.status ?? String(post.status);
    if (dto.scheduledAt !== undefined && nextStatus !== 'SCHEDULED' && dto.status !== 'DRAFT') {
      throw new BadRequestException('Choose a schedule to set a time.');
    }
    if (dto.status !== undefined || dto.scheduledAt !== undefined) {
      if (nextStatus === 'SCHEDULED') {
        const when = new Date((dto.scheduledAt ?? (post as any).scheduledAt ?? '') as any);
        if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) {
          throw new BadRequestException('Pick a time in the future.');
        }
        data.status = 'SCHEDULED';
        data.scheduledAt = when;
        data.errorMessage = null;
      } else if (nextStatus === 'DRAFT') {
        data.status = 'DRAFT';
        data.scheduledAt = null;
        data.errorMessage = null;
      }
    }

    await this.claim(post, data);
    return { ok: true, post: await this.summary(post.id) };
  }

  /** Delete a draft, scheduled or failed post. */
  async deletePost(postId: string, userId: string, expectedUpdatedAt: string) {
    const { post, role } = await this.loadPost(postId, userId);
    this.assertMayWrite(role);
    await this.planGuard.assertCanWrite(post.workspaceId);
    this.assertFresh(post, expectedUpdatedAt);

    if (post.status === 'PUBLISHED') {
      throw new BadRequestException('A published post cannot be deleted here. Remove it on the platform itself.');
    }
    if (post.status === 'PENDING_APPROVAL') {
      throw new BadRequestException('This post is waiting for client approval. Wait for the answer first.');
    }

    let res: { count: number };
    try {
      res = await this.prisma.post.deleteMany({ where: { id: post.id, updatedAt: post.updatedAt, status: post.status } });
    } catch {
      throw new BadRequestException('This post could not be deleted.');
    }
    if (res.count === 0) throw this.conflict(await this.summary(post.id));
    return { ok: true };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Loads the post and the caller's role in its workspace; unknown or foreign posts look identical (404). */
  private async loadPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: POST_SELECT });
    if (!post) throw new NotFoundException('Post not found');

    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: post.workspaceId, userId },
      select: { role: true },
    });
    let role: string | null = member ? String(member.role) : null;
    if (!role) {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: post.workspaceId },
        select: { ownerId: true },
      });
      if (ws?.ownerId === userId) role = 'OWNER'; // legacy owners may lack a membership row
    }
    if (!role) throw new NotFoundException('Post not found');
    return { post, role };
  }

  private assertMayWrite(role: string) {
    if (!canWrite(role)) {
      throw new ForbiddenException('Your role can view posts but not change them.');
    }
  }

  private assertFresh(post: any, expectedUpdatedAt: string) {
    if (!isFresh(post.updatedAt, expectedUpdatedAt)) {
      throw this.conflict(toPostSummary(post));
    }
  }

  /**
   * Compare-and-set: only succeeds if the post is still exactly as the caller saw
   * it. Touching the row also bumps updatedAt, so a second concurrent tap loses.
   */
  private async claim(post: any, data: Record<string, unknown>) {
    const res = await this.prisma.post.updateMany({
      where: { id: post.id, updatedAt: post.updatedAt, status: post.status },
      data: data as any,
    });
    if (res.count === 0) throw this.conflict(await this.summary(post.id));
  }

  private conflict(current: unknown) {
    return new ConflictException({
      code: 'STALE_POST',
      message: 'This post was changed since you opened it. Review the latest version and try again.',
      post: current,
    });
  }

  private async summary(postId: string) {
    const p = await this.prisma.post.findUnique({ where: { id: postId }, select: POST_SELECT });
    return p ? toPostSummary(p) : null;
  }
}
