import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class InboxService {
  private anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  constructor(private prisma: PrismaService) {}

  async getMessages(workspaceId: string, filters: {
    platform?: string;
    type?: string;
    isResolved?: boolean;
    isRead?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { platform, type, isResolved, isRead, page = 1, limit = 30 } = filters;

    const where: any = { workspaceId };
    if (platform) where.platform = platform;
    if (type) where.type = type;
    if (isResolved !== undefined) where.isResolved = isResolved;
    if (isRead !== undefined) where.isRead = isRead;

    const [messages, total] = await Promise.all([
      this.prisma.inboxMessage.findMany({
        where,
        include: { replies: { orderBy: { sentAt: 'asc' } } },
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
    return { total, unread, dms, comments, resolved };
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

  async reply(id: string, workspaceId: string, content: string, userId: string) {
    const msg = await this.prisma.inboxMessage.findUnique({
      where: { id },
      include: { workspace: { include: { socialAccounts: true } } },
    });
    if (!msg || msg.workspaceId !== workspaceId) throw new Error('Message not found');

    // Find the social account
    const account = msg.workspace.socialAccounts.find(
      a => a.platform === msg.platform && a.isActive
    );
    if (!account) throw new Error('No active social account found for this platform');

    // Decrypt token
    const { createDecipheriv } = require('crypto');
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const [ivHex, encrypted] = account.accessToken!.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const accessToken = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');

    // Send reply via Meta API
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
      // DM reply
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

    // Save reply to DB
    await this.prisma.inboxReply.create({
      data: { messageId: id, content, sentBy: userId, isAuto: false },
    });

    // Mark as read and resolved
    await this.prisma.inboxMessage.update({
      where: { id },
      data: { isRead: true, isResolved: true },
    });

    return { success: true };
  }

  async suggestReply(id: string, workspaceId: string) {
    const msg = await this.prisma.inboxMessage.findUnique({ where: { id } });
    if (!msg || msg.workspaceId !== workspaceId) throw new Error('Message not found');

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

    // Save suggestion to message
    await this.prisma.inboxMessage.update({
      where: { id },
      data: { aiSuggestion: suggestion },
    });

    return { suggestion };
  }
}
