import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { AgentTool, AgentToolContext } from './tool.interface';

/**
 * The only mutating tool in Phase 1 — and it never publishes or schedules
 * anything. It creates a real Post row so the draft shows up in the existing
 * dashboard drafts view, but the status is hard-coded to 'DRAFT' regardless
 * of what the model asks for: the scheduler cron only picks up posts with
 * status SCHEDULED, so a DRAFT post is inert until a human acts on it.
 *
 * It also opens a CampaignTask (status PROPOSED) linked 1:1 to the new post,
 * which is the agent-specific approval surface referenced in the blueprint —
 * separate from, and in addition to, the existing drafts UI.
 */
@Injectable()
export class DraftPostTool implements AgentTool {
  name = 'draft_post';
  description =
    'Create a DRAFT social media post for a human to review, edit, and schedule themselves. ' +
    'This never publishes or schedules anything automatically — it only creates a draft visible ' +
    'in the dashboard and logs a proposed campaign task awaiting human approval. Use this whenever ' +
    'you want to propose content; there is no tool that publishes directly.';
  input_schema = {
    type: 'object',
    properties: {
      socialAccountId: {
        type: 'string',
        description: 'The id of the connected social account this draft is for.',
      },
      content: {
        type: 'string',
        description: 'The post copy/caption.',
      },
      mediaUrls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional media URLs already uploaded to attach to this post.',
      },
      rationale: {
        type: 'string',
        description: 'One or two sentences on why this post serves the campaign goal — shown to the human reviewer.',
      },
    },
    required: ['socialAccountId', 'content'],
  };

  constructor(
    private prisma: PrismaService,
    private scheduler: SchedulerService,
  ) {}

  async execute(workspaceId: string, input: any, ctx: AgentToolContext) {
    // Defense in depth: re-check the kill switch here too, independent of the
    // orchestrator's own check, in case this tool is ever called some other way.
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new Error('Workspace not found.');
    }
    if (!workspace.agentEnabled) {
      throw new Error('Agent is not enabled for this workspace — draft_post refused.');
    }
    if (workspace.agentPaused) {
      throw new Error('Agent is paused for this workspace — draft_post refused.');
    }
    if (!input.socialAccountId || !input.content) {
      throw new Error('draft_post requires socialAccountId and content.');
    }

    // status is hard-coded — never trust model input here.
    const post = await this.scheduler.createPost({
      workspaceId,
      socialAccountId: input.socialAccountId,
      content: input.content,
      mediaUrls: input.mediaUrls || [],
      status: 'DRAFT',
    } as any);

    if (ctx.campaignId) {
      await this.prisma.campaignTask.create({
        data: {
          campaignId: ctx.campaignId,
          type: 'CONTENT_DRAFT',
          payload: {
            content: input.content,
            mediaUrls: input.mediaUrls || [],
            rationale: input.rationale || null,
          },
          status: 'PROPOSED',
          postId: post.id,
        },
      });
    }

    return {
      postId: post.id,
      status: 'DRAFT',
      message: 'Draft created and awaiting human review in the dashboard. Nothing was scheduled or published.',
    };
  }
}
