import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { AiUsageService } from '../ai/ai-usage.service';

// Marks memories written by the auto-seeder so a re-seed can replace only its
// own output and never clobber memories a human added by hand.
const AUTO_SOURCE = 'auto-seed:brand-brain';
const MODEL = 'claude-sonnet-4-5';
const VALID_KINDS = ['BRAND', 'AUDIENCE', 'WINNING_CONTENT', 'CAMPAIGN_LEARNING'] as const;

/**
 * Brand Brain seeding — turns the data the workspace already has (its own
 * published posts, its CRM/clients, and what the human rejected from the agent)
 * into concise WorkspaceMemory entries the agent reads before drafting. This is
 * what makes agent proposals sound like the brand instead of generic. It never
 * touches publishing and re-seeding is idempotent (replaces only auto entries).
 */
@Injectable()
export class BrandBrainService {
  private readonly logger = new Logger(BrandBrainService.name);
  private anthropic: Anthropic;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private aiUsage: AiUsageService,
  ) {
    this.anthropic = new Anthropic({ apiKey: this.config.get<string>('ANTHROPIC_API_KEY') });
  }

  async listMemories(workspaceId: string) {
    return this.prisma.workspaceMemory.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async addMemory(workspaceId: string, kind: string, content: string) {
    if (!VALID_KINDS.includes(kind as any)) {
      throw new BadRequestException(`kind must be one of: ${VALID_KINDS.join(', ')}`);
    }
    if (!content?.trim()) throw new BadRequestException('content is required.');
    return this.prisma.workspaceMemory.create({
      data: { workspaceId, kind: kind as any, content: content.trim(), sourceRef: 'manual' },
    });
  }

  async deleteMemory(workspaceId: string, memoryId: string) {
    const mem = await this.prisma.workspaceMemory.findUnique({ where: { id: memoryId } });
    if (!mem || mem.workspaceId !== workspaceId) {
      throw new NotFoundException('Memory not found for this workspace.');
    }
    await this.prisma.workspaceMemory.delete({ where: { id: memoryId } });
    return { id: memoryId, deleted: true };
  }

  /**
   * Gathers the workspace's own signals, asks the model to distill them into a
   * handful of durable memory entries, and replaces the previous auto-seeded
   * set. Human-added memories (sourceRef !== AUTO_SOURCE) are left untouched.
   */
  async seedBrandBrain(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found.');

    // Gated + metered like every other AI feature (Growth+ via agentActionsPerMonth).
    await this.aiUsage.checkAndIncrement(workspaceId, 'AGENT_ACTION');

    const [publishedPosts, clients, rejectedTasks] = await Promise.all([
      this.prisma.post.findMany({
        where: { workspaceId, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 40,
        include: { socialAccount: { select: { platform: true } } },
      }),
      this.prisma.client.findMany({
        where: { workspaceId },
        take: 50,
        select: { name: true, company: true, tags: true, stage: true },
      }),
      this.prisma.campaignTask.findMany({
        where: { campaign: { workspaceId }, status: 'REJECTED', type: 'CONTENT_DRAFT' },
        orderBy: { updatedAt: 'desc' },
        take: 15,
      }),
    ]);

    if (publishedPosts.length === 0 && clients.length === 0) {
      throw new BadRequestException(
        'Not enough data to seed the Brand Brain yet — publish a few posts or add clients first.',
      );
    }

    const postSamples = publishedPosts
      .map((p) => `- [${p.socialAccount?.platform ?? '?'}] ${(p.content || '').replace(/\s+/g, ' ').slice(0, 400)}`)
      .join('\n');
    const clientSummary = clients
      .map((c) => `- ${c.name}${c.company ? ` (${c.company})` : ''}${c.tags?.length ? ` [${c.tags.join(', ')}]` : ''} — ${c.stage}`)
      .join('\n');
    const rejectedSamples = rejectedTasks
      .map((t: any) => `- ${(t.payload?.content || '').replace(/\s+/g, ' ').slice(0, 250)}`)
      .filter((s) => s.length > 4)
      .join('\n');

    const prompt = [
      `You are building a "Brand Brain" — durable memory for an AI social media agent that serves the workspace "${workspace.name}".`,
      'Analyze the workspace\'s OWN data below and distill it into a small set of concise, reusable memory entries the agent will read before drafting posts.',
      '',
      publishedPosts.length ? `Published posts (the brand's real voice):\n${postSamples}` : '(no published posts yet)',
      '',
      clients.length ? `Clients / audience (CRM):\n${clientSummary}` : '(no clients yet)',
      '',
      rejectedSamples ? `Drafts the human REJECTED (learn what to avoid):\n${rejectedSamples}` : '',
      '',
      'Return ONLY a JSON array (no prose, no code fences) of 4-8 objects, each: {"kind": <one of BRAND, AUDIENCE, WINNING_CONTENT, CAMPAIGN_LEARNING>, "content": <string>}.',
      'Guidance:',
      '- BRAND: 1-2 entries capturing voice, tone, recurring themes, and any signature phrasing/emoji habits.',
      '- AUDIENCE: 1-2 entries on who they serve (from the CRM) and what those people care about.',
      '- WINNING_CONTENT: 1-3 entries describing the content patterns/formats that fit this brand (grounded in the real posts).',
      '- CAMPAIGN_LEARNING: 0-2 entries on what to avoid, especially from rejected drafts.',
      'Each content string must be self-contained, specific to THIS brand (not generic marketing advice), and under 400 characters.',
    ].join('\n');

    let entries: Array<{ kind: string; content: string }> = [];
    try {
      const message = await this.anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('Model did not return a JSON array.');
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      entries = (Array.isArray(parsed) ? parsed : [])
        .filter((e) => e && VALID_KINDS.includes(e.kind) && typeof e.content === 'string' && e.content.trim())
        .map((e) => ({ kind: e.kind, content: e.content.trim().slice(0, 600) }));
    } catch (err: any) {
      this.logger.error(`Brand Brain seeding — model/parse error: ${err.message}`);
      throw new BadRequestException('Could not generate brand memory right now — please try again.');
    }

    if (entries.length === 0) {
      throw new BadRequestException('The model returned no usable memory entries — please try again.');
    }

    // Replace only the previous AUTO-seeded entries; keep human-added ones.
    await this.prisma.$transaction([
      this.prisma.workspaceMemory.deleteMany({ where: { workspaceId, sourceRef: AUTO_SOURCE } }),
      this.prisma.workspaceMemory.createMany({
        data: entries.map((e) => ({
          workspaceId,
          kind: e.kind as any,
          content: e.content,
          sourceRef: AUTO_SOURCE,
        })),
      }),
    ]);

    this.logger.log(`Brand Brain seeded for ${workspaceId}: ${entries.length} entries from ${publishedPosts.length} posts / ${clients.length} clients.`);
    return {
      seeded: entries.length,
      fromPosts: publishedPosts.length,
      fromClients: clients.length,
      entries,
    };
  }
}
