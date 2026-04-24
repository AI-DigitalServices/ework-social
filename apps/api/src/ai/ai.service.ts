import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { getPlanLimits } from '../common/plan-limits';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private anthropic: Anthropic;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  // Check and count AI usage this month
  private async checkAiLimit(workspaceId: string): Promise<void> {
    const plan = await this.planGuard.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);

    if (limits.aiCaptionsPerMonth === 0) {
      throw new ForbiddenException(
        'AI features are not available on your FREE plan. Upgrade to Starter or above.'
      );
    }

    if (limits.aiCaptionsPerMonth === 999999) return; // Unlimited — Agency Pro

    // Count AI uses this month via notifications as a proxy
    // In production you'd add an AiUsage table — for now we use a simple approach
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usageCount = await this.prisma.notification.count({
      where: {
        user: { ownedWorkspaces: { some: { id: workspaceId } } },
        type: 'ai_caption_used',
        createdAt: { gte: startOfMonth },
      },
    });

    if (usageCount >= limits.aiCaptionsPerMonth) {
      throw new ForbiddenException(
        `You've used all ${limits.aiCaptionsPerMonth} AI captions for this month. Upgrade for more.`
      );
    }
  }

  private async trackAiUsage(workspaceId: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (workspace) {
      await this.prisma.notification.create({
        data: {
          userId: workspace.ownerId,
          type: 'ai_caption_used',
          title: '✨ AI caption generated',
          message: 'An AI caption was generated for your post.',
          read: true, // Silent tracking — don't show as unread
        },
      });
    }
  }

  async generateCaptions(
    workspaceId: string,
    topic: string,
    platform: string,
    tone: string,
    clientName?: string,
  ): Promise<{ captions: string[] }> {
    await this.checkAiLimit(workspaceId);

    const platformLimits: Record<string, number> = {
      TWITTER: 280, INSTAGRAM: 2200, FACEBOOK: 63206,
      LINKEDIN: 3000, TIKTOK: 2200, YOUTUBE: 5000, BLUESKY: 300,
    };

    const charLimit = platformLimits[platform] || 2200;

    const prompt = `You are a social media expert for African digital agencies.

Generate 3 different ${platform} captions for the following topic:
Topic: "${topic}"
${clientName ? `Brand/Client: ${clientName}` : ''}
Tone: ${tone}
Platform: ${platform}
Character limit: ${charLimit}

Requirements:
- Each caption must be under ${charLimit} characters
- Make them engaging and suitable for African audiences
- Include relevant emojis
- Include a call to action
- For Instagram/TikTok: include 5-8 relevant hashtags at the end
- For LinkedIn: keep it professional, no hashtag spam
- For Twitter/Bluesky: keep it punchy and concise
- Number each caption as 1., 2., 3.
- Separate each caption with ---

Return ONLY the 3 captions, nothing else.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const captions = text
        .split('---')
        .map(c => c.replace(/^\d+\.\s*/, '').trim())
        .filter(c => c.length > 0)
        .slice(0, 3);

      await this.trackAiUsage(workspaceId);

      return { captions };
    } catch (err: any) {
      throw new BadRequestException('AI caption generation failed: ' + err.message);
    }
  }

  async generateHashtags(
    workspaceId: string,
    content: string,
    platform: string,
  ): Promise<{ hashtags: string[] }> {
    const plan = await this.planGuard.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);

    if (!limits.aiHashtagsEnabled) {
      throw new ForbiddenException('Hashtag AI is available on Growth plan and above.');
    }

    const prompt = `Generate 10-15 highly relevant hashtags for this ${platform} post targeted at African audiences.

Post content: "${content}"

Requirements:
- Mix of popular and niche hashtags
- Include some Africa-specific hashtags where relevant
- Return ONLY the hashtags, one per line, starting with #
- No explanations, just hashtags`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const hashtags = text
        .split('\n')
        .map(h => h.trim())
        .filter(h => h.startsWith('#'))
        .slice(0, 15);

      return { hashtags };
    } catch (err: any) {
      throw new BadRequestException('Hashtag generation failed: ' + err.message);
    }
  }

  async rewritePost(
    workspaceId: string,
    content: string,
    instruction: string,
    platform: string,
  ): Promise<{ rewritten: string }> {
    const plan = await this.planGuard.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);

    if (!limits.aiRewriteEnabled) {
      throw new ForbiddenException('Post rewriting is available on Growth plan and above.');
    }

    const prompt = `Rewrite this ${platform} post with the following instruction: "${instruction}"

Original post:
"${content}"

Requirements:
- Keep it suitable for ${platform}
- Maintain the core message
- Return ONLY the rewritten post, nothing else`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const rewritten = message.content[0].type === 'text' ? message.content[0].text.trim() : content;
      return { rewritten };
    } catch (err: any) {
      throw new BadRequestException('Post rewrite failed: ' + err.message);
    }
  }

  async getCrmInsights(workspaceId: string): Promise<{ insights: string[] }> {
    const plan = await this.planGuard.getWorkspacePlan(workspaceId);
    const limits = getPlanLimits(plan);

    if (!limits.aiCrmInsightsEnabled) {
      throw new ForbiddenException('AI CRM Insights are available on Agency Pro plan only.');
    }

    const [clients, posts] = await Promise.all([
      this.prisma.client.findMany({
        where: { workspaceId },
        include: { tasks: true, notes: true, posts: true },
      }),
      this.prisma.post.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const summary = {
      totalClients: clients.length,
      byStage: clients.reduce((acc: any, c) => {
        acc[c.stage] = (acc[c.stage] || 0) + 1;
        return acc;
      }, {}),
      clientsWithNoRecentPosts: clients.filter(c =>
        !c.posts.some(p => new Date(p.createdAt) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
      ).map(c => c.name),
      failedPosts: posts.filter(p => p.status === 'FAILED').length,
      publishedPosts: posts.filter(p => p.status === 'PUBLISHED').length,
    };

    const prompt = `You are a business intelligence analyst for a digital marketing agency.

Analyze this CRM data and provide 3-5 specific, actionable insights:

Data:
${JSON.stringify(summary, null, 2)}

Requirements:
- Each insight should be 1-2 sentences
- Be specific and actionable
- Flag any churn risks
- Suggest follow-up actions
- Number each insight as 1., 2., etc.
- Return ONLY the numbered insights, nothing else`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const insights = text
        .split('\n')
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(i => i.length > 0);

      return { insights };
    } catch (err: any) {
      throw new BadRequestException('CRM insights failed: ' + err.message);
    }
  }
}
