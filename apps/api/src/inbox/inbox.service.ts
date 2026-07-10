import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { AiUsageService } from '../ai/ai-usage.service';
import { PostHogService } from '../analytics/posthog.service';

const INBOX_TAGS = ['Lead', 'VIP Client', 'Support', 'Opportunity', 'Spam', 'Follow Up'];

@Injectable()
export class InboxService {
  private anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  constructor(
    private prisma: PrismaService,
    private aiUsage: AiUsageService,
    private posthog: PostHogService,
  ) {}

  async getMessages(workspaceId: string, filters: {
    platform?: string;
    type?: string;
    isResolved?: boolean;
    isRead?: boolean;
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { platform, type, isResolved, isRead, tag, search, page = 1, limit = 30 } = filters;

    const where: any = { workspaceId };
    if (platform) where.platform = platform;
    if (type) where.type = type;
    if (isResolved !== undefined) where.isResolved = isResolved;
    if (isRead !== undefined) where.isRead = isRead;
    if (tag) where.tags = { has: tag };
    if (search) where.OR = [
      { content: { contains: search, mode: 'insensitive' } },
      { senderName: { contains: search, mode: 'insensitive' } },
    ];

    const [messages, total] = await Promise.all([
      this.prisma.inboxMessage.findMany({
        where,
        include: {
          replies: { orderBy: { sentAt: 'asc' } },
          crmClient: { select: { id: true, name: true, stage: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inboxMessage.count({ where }),
    ]);

    return { messages, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats(workspaceId: string) {
    const [total, unread, dms, comments, resolved] = await Promise.all([
      this.prisma.inboxMessage.count({ where: { workspaceId } }),
      this.prisma.inboxMessage.count({ where: { workspaceId, isRead: false } }),
      this.prisma.inboxMessage.count({ where: { workspaceId, type: 'DM' } }),
      this.prisma.inboxMessage.count({ where: { workspaceId, type: 'COMMENT' } }),
      this.prisma.inboxMessage.count({ where: { workspaceId, isResolved: true } }),
    ]);
    return { total, unread, dms, comments, resolved, availableTags: INBOX_TAGS };
  }

  async markRead(id: string, workspaceId: string) {
    return this.prisma.inboxMessage.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markResolved(id: string, workspaceId: string) {
    return this.prisma.inboxMessage.update({
      where: { id },
      data: { isResolved: true },
    });
  }

  async tagMessage(id: string, workspaceId: string, tags: string[]) {
    const msg = await this.prisma.inboxMessage.findUnique({ where: { id } });
    if (!msg || msg.workspaceId !== workspaceId) throw new NotFoundException('Message not found');

    return this.prisma.inboxMessage.update({
      where: { id },
      data: { tags },
    });
  }

  async linkToCrm(id: string, workspaceId: string, clientId: string | null) {
    const msg = await this.prisma.inboxMessage.findUnique({ where: { id } });
    if (!msg || msg.workspaceId !== workspaceId) throw new NotFoundException('Message not found');

    // If linking, verify the client belongs to this workspace
    if (clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, workspaceId },
      });
      if (!client) throw new NotFoundException('Client not found');

      // Log activity on the CRM client
      await this.prisma.activity.create({
        data: {
          clientId,
          type: 'DM_RECEIVED',
          description: `Inbox message linked from ${msg.platform} ${msg.type.toLowerCase()} — "${msg.content.slice(0, 80)}${msg.content.length > 80 ? '…' : ''}"`,
          metadata: { inboxMessageId: id, platform: msg.platform, type: msg.type },
        },
      });
    }

    return this.prisma.inboxMessage.update({
      where: { id },
      data: { crmClientId: clientId },
      include: { crmClient: { select: { id: true, name: true, stage: true } } },
    });
  }

  async createCrmContactFromMessage(id: string, workspaceId: string) {
    const msg = await this.prisma.inboxMessage.findUnique({ where: { id } });
    if (!msg || msg.workspaceId !== workspaceId) throw new NotFoundException('Message not found');

    // Create a new CRM client from this message sender
    const client = await this.prisma.client.create({
      data: {
        workspaceId,
        name: msg.senderName || `${msg.platform} User`,
        stage: 'LEAD',
        source: msg.platform === 'INSTAGRAM' ? 'INSTAGRAM_DM' : msg.platform === 'FACEBOOK' ? 'FACEBOOK_DM' : 'OTHER',
        tags: [msg.platform.toLowerCase(), msg.type.toLowerCase()],
        socialProfiles: msg.senderId ? {
          [msg.platform.toLowerCase()]: { id: msg.senderId, username: msg.senderName },
        } : {},
        lastContactedAt: new Date(),
      },
    });

    // Link this message to the new client
    await this.prisma.inboxMessage.update({
      where: { id },
      data: { crmClientId: client.id },
    });

    await this.prisma.activity.create({
      data: {
        clientId: client.id,
        type: 'CREATED',
        description: `Lead created from ${msg.platform} ${msg.type.toLowerCase()} — "${msg.content.slice(0, 80)}${msg.content.length > 80 ? '…' : ''}"`,
        metadata: { inboxMessageId: id, platform: msg.platform },
      },
    });

    return client;
  }

  async assignMessage(id: string, workspaceId: string, userId: string | null) {
    const msg = await this.prisma.inboxMessage.findUnique({ where: { id } });
    if (!msg || msg.workspaceId !== workspaceId) throw new NotFoundException('Message not found');

    return this.prisma.inboxMessage.update({
      where: { id },
      data: { assignedToId: userId },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
  }

  async reply(id: string, workspaceId: string, content: string, userId: string) {
    const msg = await this.prisma.inboxMessage.findUnique({
      where: { id },
      include: { workspace: { include: { socialAccounts: true } } },
    });
    if (!msg || msg.workspaceId !== workspaceId) throw new NotFoundException('Message not found');

    const account = msg.workspace.socialAccounts.find(
      a => a.platform === msg.platform && a.isActive
    );
    if (!account) throw new Error('No active social account found for this platform');

    const { createDecipheriv } = require('crypto');
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const [ivHex, encrypted] = account.accessToken!.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const accessToken = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');

    if (msg.type === 'COMMENT') {
      if (msg.platform === 'INSTAGRAM') {
        await axios.post(
          `https://graph.facebook.com/v19.0/${msg.externalId}/replies`,
          null,
          { params: { message: content, access_token: accessToken } }
        );
      } else {
        await axios.post(
          `https://graph.facebook.com/v19.0/${msg.externalId}/comments`,
          { message: content, access_token: accessToken }
        );
      }
    } else {
      const fbAccount = msg.workspace.socialAccounts.find(
        a => a.platform === 'FACEBOOK' && a.isActive
      );
      const pageId = fbAccount?.accountId || account.accountId;
      await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/messages`,
        {
          recipient: { id: msg.senderId },
          message: { text: content },
          messaging_type: 'RESPONSE',
          access_token: accessToken,
        }
      );
    }

    await this.prisma.inboxReply.create({
      data: { messageId: id, content, sentBy: userId, isAuto: false },
    });

    await this.prisma.inboxMessage.update({
      where: { id },
      data: { isRead: true, isResolved: true },
    });

    // If linked to CRM, log the reply as activity
    if (msg.crmClientId) {
      await this.prisma.activity.create({
        data: {
          clientId: msg.crmClientId,
          type: 'NOTE_ADDED',
          description: `Reply sent via ${msg.platform} ${msg.type.toLowerCase()}: "${content.slice(0, 100)}${content.length > 100 ? '…' : ''}"`,
          metadata: { inboxMessageId: id, platform: msg.platform, replyContent: content },
        },
      });
    }

    this.posthog.capture(workspaceId, 'inbox_reply_sent', { platform: msg.platform, type: msg.type });

    return { success: true };
  }

  async suggestReply(id: string, workspaceId: string) {
    const msg = await this.prisma.inboxMessage.findUnique({ where: { id } });
    if (!msg || msg.workspaceId !== workspaceId) throw new NotFoundException('Message not found');

    await this.aiUsage.checkAndIncrement(workspaceId, 'REPLY_SUGGEST');

    const prompt = `You are a professional social media manager for a digital marketing agency.
A ${msg.platform} user sent this ${msg.type.toLowerCase()} from @${msg.senderName || 'a user'}:
"${msg.content}"

Write a professional, friendly, and engaging reply in 1-3 sentences.
Be conversational but professional. Don't use emojis unless appropriate.
Reply in the same language as the message.
Only return the reply text, nothing else.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const suggestion = (response.content[0] as any).text;

    await this.prisma.inboxMessage.update({
      where: { id },
      data: { aiSuggestion: suggestion },
    });

    this.posthog.capture(workspaceId, 'ai_reply_suggested', { platform: msg.platform });

    return { suggestion };
  }

  async getWorkspaceClients(workspaceId: string) {
    return this.prisma.client.findMany({
      where: { workspaceId },
      select: { id: true, name: true, stage: true },
      orderBy: { name: 'asc' },
    });
  }

  async getWorkspaceMembers(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return members.map(m => m.user);
  }
}
