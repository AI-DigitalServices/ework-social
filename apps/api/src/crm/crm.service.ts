import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  async getClients(workspaceId: string) {
    return this.prisma.client.findMany({
      where: { workspaceId },
      include: {
        notes: { orderBy: { createdAt: 'desc' }, take: 1 },
        tasks: { where: { isDone: false } },
        _count: { select: { notes: true, tasks: true, posts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClient(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { createdAt: 'desc' } },
        _count: { select: { posts: true } },
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async createClient(dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        tags: dto.tags || [],
        workspaceId: dto.workspaceId,
      },
    });
  }

  async updateStage(id: string, stage: string) {
    return this.prisma.client.update({
      where: { id },
      data: { stage: stage as any },
    });
  }

  async deleteClient(id: string) {
    return this.prisma.client.delete({ where: { id } });
  }

  async addNote(dto: CreateNoteDto) {
    return this.prisma.note.create({
      data: { content: dto.content, clientId: dto.clientId },
    });
  }

  async addTask(dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        clientId: dto.clientId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  async toggleTask(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.update({
      where: { id },
      data: { isDone: !task.isDone },
    });
  }

  async getPipelineStats(workspaceId: string) {
    const stages = ['LEAD', 'CONTACTED', 'PROPOSAL', 'ACTIVE', 'DORMANT'];
    const counts = await Promise.all(
      stages.map(async (stage) => ({
        stage,
        count: await this.prisma.client.count({
          where: { workspaceId, stage: stage as any },
        }),
      }))
    );
    return counts;
  }
}
