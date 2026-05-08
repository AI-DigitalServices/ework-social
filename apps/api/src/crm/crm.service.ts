import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationService } from './automation.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class CrmService {
  constructor(
    private prisma: PrismaService,
    private automation: AutomationService,
  ) {}

  async getClients(
    workspaceId: string,
    filters?: { stage?: string; source?: string; assignedToId?: string },
  ) {
    const where: any = { workspaceId };
    if (filters?.stage) where.stage = filters.stage;
    if (filters?.source) where.source = filters.source;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;

    return this.prisma.client.findMany({
      where,
      include: {
        notes: { orderBy: { createdAt: 'desc' }, take: 1 },
        tasks: { where: { isDone: false } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
        _count: { select: { notes: true, tasks: true, posts: true, activities: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getClient(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { createdAt: 'desc' } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { socialAccount: { select: { platform: true, accountName: true } } },
        },
        _count: { select: { posts: true } },
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    // Get workspace social accounts with per-platform post counts for this client
    const socialAccounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId: client.workspaceId, isActive: true },
      select: { id: true, platform: true, accountName: true, accountId: true },
      orderBy: { createdAt: 'asc' },
    });

    const platformPostCounts = await this.prisma.post.groupBy({
      by: ['socialAccountId'],
      where: { clientId: id },
      _count: { id: true },
    });

    const countMap = Object.fromEntries(
      platformPostCounts.map((p) => [p.socialAccountId, p._count.id]),
    );

    return {
      ...client,
      socialAccounts: socialAccounts.map((acc) => ({
        ...acc,
        postCount: countMap[acc.id] ?? 0,
      })),
    };
  }

  async createClient(dto: CreateClientDto) {
    const client = await this.prisma.client.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        tags: dto.tags || [],
        stage: (dto.stage as any) || 'LEAD',
        source: (dto.source as any) || 'MANUAL',
        dealValue: dto.dealValue,
        nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null,
        assignedToId: dto.assignedToId || null,
        workspaceId: dto.workspaceId,
      },
    });

    await this.prisma.activity.create({
      data: {
        clientId: client.id,
        type: 'CREATED',
        description: 'Contact created manually',
        metadata: { source: 'MANUAL' },
      },
    });

    return client;
  }

  async updateClient(
    id: string,
    updates: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      tags?: string[];
      dealValue?: number;
      nextFollowUpAt?: string;
      assignedToId?: string | null;
      userId?: string;
    },
  ) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client not found');

    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.email !== undefined) data.email = updates.email;
    if (updates.phone !== undefined) data.phone = updates.phone;
    if (updates.company !== undefined) data.company = updates.company;
    if (updates.tags !== undefined) data.tags = updates.tags;
    if (updates.dealValue !== undefined) data.dealValue = updates.dealValue;
    if (updates.nextFollowUpAt !== undefined)
      data.nextFollowUpAt = updates.nextFollowUpAt ? new Date(updates.nextFollowUpAt) : null;
    if ('assignedToId' in updates) data.assignedToId = updates.assignedToId;

    const updated = await this.prisma.client.update({ where: { id }, data });

    if (updates.dealValue !== undefined && updates.dealValue !== existing.dealValue) {
      await this.prisma.activity.create({
        data: {
          clientId: id,
          userId: updates.userId,
          type: 'DEAL_UPDATED',
          description: `Deal value updated to ₦${(updates.dealValue ?? 0).toLocaleString()}`,
          metadata: { previous: existing.dealValue, current: updates.dealValue },
        },
      });
    }

    if ('assignedToId' in updates && updates.assignedToId !== existing.assignedToId) {
      await this.prisma.activity.create({
        data: {
          clientId: id,
          userId: updates.userId,
          type: 'ASSIGNED',
          description: updates.assignedToId
            ? 'Contact assigned to a team member'
            : 'Contact unassigned',
          metadata: { assignedToId: updates.assignedToId },
        },
      });
    }

    return updated;
  }

  async updateStage(id: string, stage: string, userId?: string) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client not found');

    const client = await this.prisma.client.update({
      where: { id },
      data: { stage: stage as any, lastContactedAt: new Date() },
    });

    await this.prisma.activity.create({
      data: {
        clientId: id,
        userId,
        type: 'STAGE_CHANGED',
        description: `Stage moved from ${existing.stage} to ${stage}`,
        metadata: { from: existing.stage, to: stage },
      },
    });

    try {
      await this.automation.triggerStageAutomation(client.workspaceId, id, stage);
    } catch (err) {
      console.error('Automation trigger failed:', err);
    }
    return client;
  }

  async deleteClient(id: string) {
    return this.prisma.client.delete({ where: { id } });
  }

  async addNote(dto: CreateNoteDto & { userId?: string }) {
    const note = await this.prisma.note.create({
      data: { content: dto.content, clientId: dto.clientId },
    });

    await this.prisma.activity.create({
      data: {
        clientId: dto.clientId,
        userId: dto.userId,
        type: 'NOTE_ADDED',
        description: `Note: "${dto.content.substring(0, 80)}${dto.content.length > 80 ? '…' : ''}"`,
      },
    });

    return note;
  }

  async addTask(dto: CreateTaskDto & { userId?: string }) {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        clientId: dto.clientId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });

    await this.prisma.activity.create({
      data: {
        clientId: dto.clientId,
        userId: dto.userId,
        type: 'TASK_CREATED',
        description: `Task created: "${dto.title}"`,
        metadata: { dueDate: dto.dueDate },
      },
    });

    return task;
  }

  async toggleTask(id: string, userId?: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    const updated = await this.prisma.task.update({
      where: { id },
      data: { isDone: !task.isDone },
    });

    if (updated.isDone) {
      await this.prisma.activity.create({
        data: {
          clientId: task.clientId,
          userId,
          type: 'TASK_COMPLETED',
          description: `Task completed: "${task.title}"`,
        },
      });
    }

    return updated;
  }

  async getActivityLog(clientId: string) {
    return this.prisma.activity.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async getPipelineStats(workspaceId: string) {
    const stages = ['LEAD', 'CONTACTED', 'PROPOSAL', 'ACTIVE', 'DORMANT'];
    const [counts, dealValueByStage] = await Promise.all([
      Promise.all(
        stages.map(async (stage) => ({
          stage,
          count: await this.prisma.client.count({
            where: { workspaceId, stage: stage as any },
          }),
        })),
      ),
      this.prisma.client.groupBy({
        by: ['stage'],
        where: { workspaceId, dealValue: { not: null } },
        _sum: { dealValue: true },
      }),
    ]);

    const dealMap = Object.fromEntries(
      dealValueByStage.map((d) => [d.stage, d._sum.dealValue ?? 0]),
    );

    return counts.map((c) => ({ ...c, dealValue: dealMap[c.stage] ?? 0 }));
  }

  async exportClients(workspaceId: string): Promise<string> {
    const clients = await this.prisma.client.findMany({
      where: { workspaceId },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Name', 'Email', 'Phone', 'Company', 'Stage', 'Source',
      'Deal Value', 'Tags', 'Assigned To', 'Created',
    ];
    const rows = clients.map((c) =>
      [
        c.name,
        c.email ?? '',
        c.phone ?? '',
        c.company ?? '',
        c.stage,
        c.source,
        c.dealValue?.toString() ?? '',
        c.tags.join('; '),
        c.assignedTo?.name ?? '',
        c.createdAt.toISOString(),
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
