import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import type { WebhookEvent } from '../webhooks/webhook-events';
import { AutomationService } from '../crm/automation.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import type { AuthedApiKey } from './api-key.util';
import {
  POST_LIST_STATUSES, asObject, cleanDate, cleanDeal, cleanEmail, cleanLimit, cleanMediaUrls,
  cleanSource, cleanStage, cleanString, cleanTags,
} from './public-api.validate';

// Every query here is scoped by the API key's workspaceId. Record-by-id lookups
// use findFirst({ id, workspaceId }) so a key can never reach another workspace.

const CLIENT_SELECT = {
  id: true, name: true, email: true, phone: true, company: true, tags: true, stage: true, source: true,
  dealValue: true, nextFollowUpAt: true, lastContactedAt: true, assignedToId: true, createdAt: true, updatedAt: true,
};

const POST_SELECT = {
  id: true, content: true, mediaUrls: true, status: true, scheduledAt: true, publishedAt: true, errorMessage: true,
  socialAccountId: true, clientId: true, createdAt: true, updatedAt: true,
};

@Injectable()
export class PublicApiService {
  constructor(
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
    private webhooks: WebhooksService,
    private automation: AutomationService,
    private scheduler: SchedulerService,
  ) {}

  private emit(workspaceId: string, event: WebhookEvent, data: Record<string, any>) {
    try {
      this.webhooks.dispatch(workspaceId, event, data).catch(() => {});
    } catch {
      /* a webhook problem must never break the API call */
    }
  }

  private async requireClient(workspaceId: string, id: string) {
    const c = await this.prisma.client.findFirst({ where: { id, workspaceId } });
    if (!c) throw new NotFoundException('Contact not found.');
    return c;
  }

  // ---- account ---------------------------------------------------------

  async me(key: AuthedApiKey) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: key.workspaceId },
      select: { id: true, name: true },
    });
    const plan = await this.planGuard.getWorkspacePlan(key.workspaceId);
    return { workspace: ws, plan, key: { id: key.id, name: key.name, scopes: key.scopes } };
  }

  async listAccounts(workspaceId: string) {
    return {
      data: await this.prisma.socialAccount.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true, platform: true, accountName: true, isActive: true },
      }),
    };
  }

  // ---- contacts --------------------------------------------------------

  async listClients(workspaceId: string, q: Record<string, any>) {
    const limit = cleanLimit(q.limit);
    const where: any = { workspaceId };
    const stage = cleanStage(q.stage);
    if (stage) where.stage = stage;
    const email = q.email ? cleanEmail(q.email) : undefined;
    if (email) where.email = { equals: email, mode: 'insensitive' };
    if (q.updatedSince) {
      const d = cleanDate(String(q.updatedSince), 'updatedSince');
      if (d) where.updatedAt = { gt: d };
    }
    const rows = await this.prisma.client.findMany({
      where,
      select: CLIENT_SELECT,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: String(q.cursor) }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async getClient(workspaceId: string, id: string) {
    const c = await this.prisma.client.findFirst({
      where: { id, workspaceId },
      select: {
        ...CLIENT_SELECT,
        notes: { select: { id: true, content: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        tasks: { where: { isDone: false }, select: { id: true, title: true, dueDate: true, createdAt: true } },
      },
    });
    if (!c) throw new NotFoundException('Contact not found.');
    return c;
  }

  async createClient(workspaceId: string, rawBody: unknown) {
    const body = asObject(rawBody);
    const name = cleanString(body.name, 'name', 200, true)!;
    const email = cleanEmail(body.email);
    const phone = cleanString(body.phone, 'phone', 50);
    const company = cleanString(body.company, 'company', 200);
    const tags = cleanTags(body.tags) || [];
    const stage = cleanStage(body.stage) || 'LEAD';
    const source = cleanSource(body.source) || 'OTHER';
    const dealValue = cleanDeal(body.dealValue);
    const nextFollowUpAt = cleanDate(body.nextFollowUpAt, 'nextFollowUpAt');

    await this.planGuard.checkClientLimit(workspaceId); // also refuses read-only workspaces

    if (email) {
      const dup = await this.prisma.client.findFirst({
        where: { workspaceId, email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (dup) throw new ConflictException({ message: 'A contact with this email already exists.', existingId: dup.id });
    }

    const client = await this.prisma.client.create({
      data: {
        workspaceId, name, email, phone, company, tags,
        stage: stage as any, source: source as any,
        dealValue: dealValue ?? null,
        nextFollowUpAt: nextFollowUpAt ?? null,
      },
      select: CLIENT_SELECT,
    });

    await this.prisma.activity.create({
      data: { clientId: client.id, type: 'CREATED', description: 'Contact created via API', metadata: { source: 'API' } },
    });

    this.emit(workspaceId, 'lead.created', {
      clientId: client.id, name: client.name, email: client.email, company: client.company,
      stage: client.stage, source: client.source,
    });
    return client;
  }

  async updateClient(workspaceId: string, id: string, rawBody: unknown) {
    const body = asObject(rawBody);
    const existing = await this.requireClient(workspaceId, id);
    const data: any = {};

    if ('name' in body) data.name = cleanString(body.name, 'name', 200, true);
    for (const [k, max] of [['phone', 50], ['company', 200]] as Array<[string, number]>) {
      if (k in body) data[k] = body[k] === null || body[k] === '' ? null : cleanString(body[k], k, max);
    }
    if ('email' in body) {
      const email = body.email === null || body.email === '' ? null : cleanEmail(body.email);
      if (email && email !== existing.email) {
        const dup = await this.prisma.client.findFirst({
          where: { workspaceId, id: { not: id }, email: { equals: email, mode: 'insensitive' } },
          select: { id: true },
        });
        if (dup) throw new ConflictException({ message: 'Another contact already uses this email.', existingId: dup.id });
      }
      data.email = email;
    }
    if ('tags' in body) data.tags = cleanTags(body.tags);
    if ('dealValue' in body) data.dealValue = cleanDeal(body.dealValue);
    if ('nextFollowUpAt' in body) data.nextFollowUpAt = cleanDate(body.nextFollowUpAt, 'nextFollowUpAt') ?? null;

    const changedFields = Object.keys(data);
    if (changedFields.length === 0) throw new BadRequestException('Nothing to update. Send at least one field.');

    const updated = await this.prisma.client.update({ where: { id }, data, select: CLIENT_SELECT });

    if (data.dealValue !== undefined && data.dealValue !== existing.dealValue) {
      await this.prisma.activity.create({
        data: {
          clientId: id,
          type: 'DEAL_UPDATED',
          description: `Deal value updated to ${(data.dealValue ?? 0).toLocaleString()} via API`,
          metadata: { previous: existing.dealValue, current: data.dealValue },
        },
      });
    }

    this.emit(workspaceId, 'client.updated', {
      clientId: id, name: updated.name, email: updated.email, company: updated.company, stage: updated.stage,
      dealValue: updated.dealValue, tags: updated.tags, assignedToId: updated.assignedToId, changedFields,
      previous: { dealValue: existing.dealValue, assignedToId: existing.assignedToId },
    });
    return updated;
  }

  async moveStage(workspaceId: string, id: string, rawBody: unknown) {
    const stage = cleanStage(asObject(rawBody).stage);
    if (!stage) throw new BadRequestException('stage is required.');
    const existing = await this.requireClient(workspaceId, id);

    const client = await this.prisma.client.update({
      where: { id },
      data: { stage: stage as any, lastContactedAt: new Date() },
      select: CLIENT_SELECT,
    });

    await this.prisma.activity.create({
      data: {
        clientId: id,
        type: 'STAGE_CHANGED',
        description: `Stage moved from ${existing.stage} to ${stage} via API`,
        metadata: { from: existing.stage, to: stage },
      },
    });

    if (existing.stage !== stage) {
      this.emit(workspaceId, 'client.stage_changed', {
        clientId: id, name: client.name, email: client.email, company: client.company,
        dealValue: client.dealValue, from: existing.stage, to: stage,
      });
    }

    try {
      await this.automation.triggerStageAutomation(workspaceId, id, stage);
    } catch (err) {
      console.error('Automation trigger failed:', err);
    }
    return client;
  }

  async addNote(workspaceId: string, id: string, rawBody: unknown) {
    const content = cleanString(asObject(rawBody).content, 'content', 5000, true)!;
    const client = await this.requireClient(workspaceId, id);
    const note = await this.prisma.note.create({ data: { clientId: id, content } });
    await this.prisma.activity.create({
      data: {
        clientId: id,
        type: 'NOTE_ADDED',
        description: `Note: "${content.substring(0, 80)}${content.length > 80 ? '…' : ''}"`,
      },
    });
    this.emit(workspaceId, 'note.added', { clientId: id, clientName: client.name, noteId: note.id, content: note.content });
    return { id: note.id, clientId: id, content: note.content, createdAt: note.createdAt };
  }

  async addTask(workspaceId: string, id: string, rawBody: unknown) {
    const body = asObject(rawBody);
    const title = cleanString(body.title, 'title', 200, true)!;
    const dueDate = cleanDate(body.dueDate, 'dueDate');
    const client = await this.requireClient(workspaceId, id);
    const task = await this.prisma.task.create({ data: { clientId: id, title, dueDate: dueDate ?? null } });
    await this.prisma.activity.create({
      data: { clientId: id, type: 'TASK_CREATED', description: `Task created: "${title}"`, metadata: { dueDate: dueDate ?? null } },
    });
    this.emit(workspaceId, 'task.created', {
      clientId: id, clientName: client.name, taskId: task.id, title: task.title, dueDate: task.dueDate,
    });
    return { id: task.id, clientId: id, title: task.title, dueDate: task.dueDate, isDone: task.isDone, createdAt: task.createdAt };
  }

  async completeTask(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, client: { workspaceId } },
      include: { client: { select: { id: true, name: true } } },
    });
    if (!task) throw new NotFoundException('Task not found.');
    if (task.isDone) return { id: task.id, clientId: task.clientId, title: task.title, isDone: true };

    const updated = await this.prisma.task.update({ where: { id: taskId }, data: { isDone: true } });
    await this.prisma.activity.create({
      data: { clientId: task.clientId, type: 'TASK_COMPLETED', description: `Task completed: "${task.title}"` },
    });
    this.emit(workspaceId, 'task.completed', {
      clientId: task.clientId, clientName: task.client?.name, taskId: task.id, title: task.title,
    });
    return { id: updated.id, clientId: task.clientId, title: updated.title, isDone: updated.isDone };
  }

  // ---- posts -----------------------------------------------------------

  async listPosts(workspaceId: string, q: Record<string, any>) {
    const limit = cleanLimit(q.limit);
    const where: any = { workspaceId };
    if (q.status) {
      const s = String(q.status).toUpperCase();
      if (!POST_LIST_STATUSES.includes(s)) throw new BadRequestException(`status must be one of: ${POST_LIST_STATUSES.join(', ')}.`);
      where.status = s;
    }
    const rows = await this.prisma.post.findMany({
      where,
      select: POST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: String(q.cursor) }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  /** Drafts and scheduled posts only. Publishing immediately is deliberately not offered. */
  async createPost(workspaceId: string, rawBody: unknown) {
    const body = asObject(rawBody);
    const content = cleanString(body.content, 'content', 5000, true)!;
    const socialAccountId = cleanString(body.socialAccountId, 'socialAccountId', 100, true)!;
    const status = String(body.status ?? 'DRAFT').toUpperCase();
    if (status !== 'DRAFT' && status !== 'SCHEDULED') {
      throw new BadRequestException('status must be DRAFT or SCHEDULED. Publishing immediately is not available through the API.');
    }
    const mediaUrls = cleanMediaUrls(body.mediaUrls);

    let scheduledAt: Date | undefined;
    if (status === 'SCHEDULED') {
      const d = cleanDate(body.scheduledAt, 'scheduledAt');
      if (!d) throw new BadRequestException('scheduledAt is required when status is SCHEDULED.');
      if (d.getTime() < Date.now() + 60_000) throw new BadRequestException('scheduledAt must be at least one minute in the future.');
      scheduledAt = d;
    }

    const account = await this.prisma.socialAccount.findFirst({
      where: { id: socialAccountId, workspaceId, isActive: true },
      select: { id: true },
    });
    if (!account) throw new NotFoundException('Social account not found in this workspace. List valid ids with GET /accounts.');

    let clientId: string | undefined;
    if (body.clientId) {
      const c = await this.prisma.client.findFirst({ where: { id: String(body.clientId), workspaceId }, select: { id: true } });
      if (!c) throw new NotFoundException('Contact not found in this workspace.');
      clientId = c.id;
    }

    // 'EDITOR' = the least privileged role that may write; plan limits and read-only checks still run inside.
    const post: any = await this.scheduler.createPost(
      { workspaceId, socialAccountId, content, mediaUrls, scheduledAt: scheduledAt?.toISOString(), clientId, status } as any,
      'EDITOR',
    );
    return {
      id: post.id, status: post.status, content: post.content, mediaUrls: post.mediaUrls,
      scheduledAt: post.scheduledAt, socialAccountId: post.socialAccountId, platform: post.socialAccount?.platform ?? null,
      clientId: post.clientId, createdAt: post.createdAt,
    };
  }
}
