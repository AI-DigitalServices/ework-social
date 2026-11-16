import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentTool } from './tool.interface';

/**
 * Read-only. Gives the agent a client's CRM context — pipeline stage, tags,
 * recent notes, and recent post history — so it can tailor tone and content
 * (e.g. reassure an "At Risk" client, celebrate a "Won" one). Workspace-scoped
 * Prisma reads only; never mutates anything.
 */
@Injectable()
export class GetClientContextTool implements AgentTool {
  name = 'get_client_context';
  description =
    "Read-only. Look up a CRM client's context — pipeline stage, tags, deal value, recent notes, and recent " +
    'post history — so you can tailor tone and content to where the relationship stands. Pass clientId or ' +
    'clientName; pass neither to list this workspace\'s clients and their stages so you can pick one.';
  input_schema = {
    type: 'object',
    properties: {
      clientId: { type: 'string', description: 'The client id, if known.' },
      clientName: { type: 'string', description: 'The client name (or part of it) to look up.' },
    },
    required: [],
  };

  constructor(private prisma: PrismaService) {}

  async execute(workspaceId: string, input: any) {
    // No identifier → list clients so the agent can choose one.
    if (!input.clientId && !input.clientName) {
      const clients = await this.prisma.client.findMany({
        where: { workspaceId },
        select: { id: true, name: true, company: true, stage: true },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      });
      return { clients };
    }

    const client = await this.prisma.client.findFirst({
      where: {
        workspaceId,
        ...(input.clientId
          ? { id: input.clientId }
          : { name: { contains: input.clientName, mode: 'insensitive' } }),
      },
      include: {
        notes: { orderBy: { createdAt: 'desc' }, take: 3 },
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { socialAccount: { select: { platform: true } } },
        },
      },
    });

    if (!client) return { found: false, message: 'No matching client in this workspace.' };

    return {
      found: true,
      client: {
        id: client.id,
        name: client.name,
        company: client.company,
        stage: client.stage,
        tags: client.tags,
        dealValue: client.dealValue,
        lastContactedAt: client.lastContactedAt,
      },
      recentNotes: client.notes.map((n) => ({ content: n.content, createdAt: n.createdAt })),
      recentPosts: client.posts.map((p) => ({
        content: (p.content || '').slice(0, 120),
        status: p.status,
        platform: p.socialAccount?.platform,
        createdAt: p.createdAt,
      })),
    };
  }
}
