import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { AiUsageService } from '../ai/ai-usage.service';
import { ToolRegistryService } from './tools/tool-registry.service';

// Bounds a single run to a handful of think→act turns so a confused model
// can't loop forever burning tokens. 6 is generous for "check analytics,
// check inbox, propose 1-3 drafts, summarize."
const MAX_TURNS = 6;
const MODEL = 'claude-sonnet-4-5';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private anthropic: Anthropic;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private aiUsage: AiUsageService,
    private toolRegistry: ToolRegistryService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  // ── Kill switch controls ──────────────────────────────────────────────

  async enable(workspaceId: string) {
    await this.assertWorkspace(workspaceId);
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { agentEnabled: true },
    });
  }

  async pause(workspaceId: string) {
    await this.assertWorkspace(workspaceId);
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { agentPaused: true },
    });
  }

  async resume(workspaceId: string) {
    await this.assertWorkspace(workspaceId);
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { agentPaused: false },
    });
  }

  async getStatus(workspaceId: string) {
    const workspace = await this.assertWorkspace(workspaceId);
    const recentRuns = await this.prisma.agentRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return {
      agentEnabled: workspace.agentEnabled,
      agentPaused: workspace.agentPaused,
      recentRuns,
    };
  }

  async listRuns(workspaceId: string, take = 20) {
    await this.assertWorkspace(workspaceId);
    return this.prisma.agentRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  // ── Campaigns ────────────────────────────────────────────────────────

  /**
   * Creates a Campaign row for a human to later trigger runs against. This
   * doesn't touch the agent or any tool — it's just the brief record. No
   * frontend exists yet for this (Phase 1 backend only); this endpoint also
   * lets us test the orchestrator end-to-end before building the real
   * Campaign Wizard UI.
   */
  async createCampaign(
    workspaceId: string,
    dto: { goal: string; brief: string; platforms: string[]; clientId?: string },
  ) {
    await this.assertWorkspace(workspaceId);
    if (!dto.goal?.trim() || !dto.brief?.trim() || !dto.platforms?.length) {
      throw new BadRequestException('goal, brief, and at least one platform are required.');
    }
    return this.prisma.campaign.create({
      data: {
        workspaceId,
        clientId: dto.clientId || null,
        goal: dto.goal.trim(),
        brief: dto.brief.trim(),
        platforms: dto.platforms,
        status: 'DRAFT',
      },
    });
  }

  async listCampaigns(workspaceId: string) {
    await this.assertWorkspace(workspaceId);
    return this.prisma.campaign.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: { tasks: true },
    });
  }

  // ── The orchestrator loop ────────────────────────────────────────────

  /**
   * Runs one shadow-mode reasoning cycle for a campaign: the model gets the
   * campaign brief, Brand Brain memory, and the Tool Registry, and works
   * toward a proposal. Every tool call is logged; the whole run is written
   * to AgentRun as an immutable audit record regardless of outcome. Nothing
   * in this path can publish or schedule — that boundary lives in the tools
   * themselves (see draft-post.tool.ts).
   */
  async runCampaignCycle(workspaceId: string, campaignId: string, trigger: string) {
    const workspace = await this.assertWorkspace(workspaceId);

    if (!workspace.agentEnabled) {
      throw new ForbiddenException('Agent is not enabled for this workspace.');
    }
    if (workspace.agentPaused) {
      throw new ForbiddenException('Agent is paused for this workspace.');
    }

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.workspaceId !== workspaceId) {
      throw new NotFoundException('Campaign not found for this workspace.');
    }

    // Meters + gates by plan (agentActionsPerMonth — 0 below Growth). Throws
    // ForbiddenException on cap/plan block, same pattern as every other AI
    // feature in this codebase.
    await this.aiUsage.checkAndIncrement(workspaceId, 'AGENT_ACTION');

    const memories = await this.prisma.workspaceMemory.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const system = this.buildSystemPrompt(campaign, memories);
    const toolDefs = this.toolRegistry.getAnthropicToolDefs();

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Campaign goal: ${campaign.goal}\n\nBrief: ${campaign.brief}\n\nPlatforms: ${campaign.platforms.join(', ')}`,
      },
    ];

    const toolCallLog: Array<{ tool: string; input: any; error?: string }> = [];
    let tokensIn = 0;
    let tokensOut = 0;
    let outcome: 'SUCCESS' | 'FAILED' | 'NEEDS_APPROVAL' = 'SUCCESS';
    let summary = '';

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const response = await this.anthropic.messages.create({
          model: MODEL,
          max_tokens: 2048,
          system,
          tools: toolDefs as any,
          messages,
        });

        tokensIn += response.usage?.input_tokens || 0;
        tokensOut += response.usage?.output_tokens || 0;

        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );

        if (toolUseBlocks.length === 0) {
          const textBlock = response.content.find(
            (b): b is Anthropic.TextBlock => b.type === 'text',
          );
          summary = textBlock?.text || '';
          break;
        }

        messages.push({ role: 'assistant', content: response.content as any });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of toolUseBlocks) {
          try {
            const result = await this.toolRegistry.execute(block.name, workspaceId, block.input, {
              campaignId,
            });
            toolCallLog.push({ tool: block.name, input: block.input });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (err: any) {
            toolCallLog.push({ tool: block.name, input: block.input, error: err.message });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Error: ${err.message}`,
              is_error: true,
            });
          }
        }
        messages.push({ role: 'user', content: toolResults });

        if (turn === MAX_TURNS - 1) {
          outcome = 'NEEDS_APPROVAL';
          summary = summary || 'Run reached the turn limit before finishing — review tool calls and continue manually.';
        }
      }
    } catch (err: any) {
      outcome = 'FAILED';
      summary = `Agent run failed: ${err.message}`;
      this.logger.error(summary, err.stack);
    }

    return this.prisma.agentRun.create({
      data: {
        workspaceId,
        campaignId,
        trigger,
        model: MODEL,
        toolCalls: toolCallLog as any,
        tokensIn,
        tokensOut,
        costUsd: this.estimateCostUsd(tokensIn, tokensOut),
        outcome,
        summary: summary ? summary.slice(0, 2000) : null,
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async assertWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }
    return workspace;
  }

  private buildSystemPrompt(campaign: { goal: string; brief: string }, memories: Array<{ kind: string; content: string }>) {
    const memoryBlock = memories.length
      ? memories.map((m) => `[${m.kind}] ${m.content}`).join('\n')
      : '(no saved brand memory yet)';

    return [
      'You are the eWork Social AI campaign agent, running in SHADOW MODE.',
      'You cannot publish or schedule anything — there is no tool that does that.',
      'Your only ways to act are the tools you are given: draft_post creates a DRAFT',
      'awaiting human review; get_analytics, search_inbox, and list_social_accounts are read-only.',
      'draft_post requires a real socialAccountId. If you do not already know the id for a',
      'platform, call list_social_accounts first — never guess an id, and never give up and',
      'just describe a post in your summary instead of calling draft_post. If the brief asks',
      'for multiple platforms, call draft_post once per platform that has a connected account',
      '(skip platforms with no connected account and say so in your summary).',
      'Always ground content proposals in get_analytics and search_inbox before drafting.',
      'When you are done, write a short plain-language summary of what you proposed and why.',
      '',
      'Brand Brain (workspace memory):',
      memoryBlock,
    ].join('\n');
  }

  // Sonnet list pricing as of this build; update if Anthropic's pricing changes.
  private estimateCostUsd(tokensIn: number, tokensOut: number): number {
    const inputCostPerM = 3;
    const outputCostPerM = 15;
    return (tokensIn / 1_000_000) * inputCostPerM + (tokensOut / 1_000_000) * outputCostPerM;
  }
}
