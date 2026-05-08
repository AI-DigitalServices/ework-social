import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService) {}

  async processWebhookEvent(body: any) {
    const { object, entry } = body;
    console.log(`[WEBHOOK DEBUG] processWebhookEvent called — object: ${object}, entries: ${entry?.length}`);
    this.logger.log(`Webhook received — object: ${object}, entries: ${entry?.length}`);

    if (object === 'page') {
      for (const pageEntry of entry) {
        const pageId = pageEntry.id;

        // Handle comments on posts
        if (pageEntry.changes) {
          for (const change of pageEntry.changes) {
            if (change.field === 'feed' && change.value?.item === 'comment') {
              await this.handleFacebookComment(pageId, change.value);
            }
          }
        }

        // Handle DMs (Messenger)
        if (pageEntry.messaging) {
          for (const messagingEvent of pageEntry.messaging) {
            if (messagingEvent.message && !messagingEvent.message.is_echo) {
              await this.handleFacebookDM(pageId, messagingEvent);
            }
          }
        }
      }
    }

    if (object === 'instagram') {
      for (const igEntry of entry) {
        this.logger.log(`Instagram entry id: ${igEntry.id}`);

        // Handle changes (comments, feed events)
        if (igEntry.changes) {
          for (const change of igEntry.changes) {
            this.logger.log(`Instagram change field: ${change.field}`);
            if (change.field === 'comments') {
              await this.handleInstagramComment(igEntry.id, change.value);
            }
            if (change.field === 'messages') {
              await this.handleInstagramDM(igEntry.id, change.value);
            }
          }
        }

        // Handle direct messaging events (new DMs come through messaging array)
        if (igEntry.messaging) {
          for (const messagingEvent of igEntry.messaging) {
            this.logger.log(`Instagram messaging event keys: ${Object.keys(messagingEvent).join(',')}`);
            // New message (has text)
            if (messagingEvent.message && !messagingEvent.message.is_echo) {
              this.logger.log(`Instagram DM received: "${messagingEvent.message?.text}"`);
              await this.handleInstagramDM(igEntry.id, messagingEvent);
            }
            // message_edit with num_edit=0 = new message in v25 API — fetch content via mid
            if (messagingEvent.message_edit && messagingEvent.message_edit.num_edit === 0) {
              const mid = messagingEvent.message_edit.mid;
              this.logger.log(`Instagram new DM (message_edit num_edit=0) — fetching content for mid: ${mid}`);
              await this.handleInstagramDMByMid(igEntry.id, mid);
            }
          }
        }
      }
    }
  }

  private async handleFacebookComment(pageId: string, commentData: any) {
    try {
      const commentId = commentData.comment_id;
      const commentText = commentData.message || '';
      const fromName = commentData.from?.name || 'there';

      // Find the social account for this page
      const account = await this.prisma.socialAccount.findFirst({
        where: { accountId: pageId, platform: 'FACEBOOK', isActive: true },
        include: { workspace: true },
      });
      if (!account) return;

      // Find matching rules
      const rules = await this.prisma.autoResponderRule.findMany({
        where: {
          workspaceId: account.workspaceId,
          platform: 'FACEBOOK',
          isActive: true,
        },
      });

      const matchingRule = this.findMatchingRule(rules, commentText, 'comment');
      if (!matchingRule) return;

      // Decrypt access token
      const accessToken = this.decryptToken(account.accessToken!);

      // Send reply comment
      if (matchingRule.responseType === 'comment' || matchingRule.responseType === 'both') {
        const message = matchingRule.responseMessage.replace('{name}', fromName);
        await axios.post(
          `https://graph.facebook.com/v19.0/${commentId}/comments`,
          { message, access_token: accessToken }
        );
        this.logger.log(`Facebook comment reply sent for rule: ${matchingRule.name}`);
      }

      // Send DM
      if (matchingRule.responseType === 'dm' || matchingRule.responseType === 'both') {
        const senderId = commentData.from?.id;
        if (senderId) {
          const message = matchingRule.responseMessage.replace('{name}', fromName);
          await axios.post(
            `https://graph.facebook.com/v19.0/me/messages`,
            {
              recipient: { id: senderId },
              message: { text: message },
              access_token: accessToken,
            }
          );
        }
      }

      // Update trigger count
      await this.prisma.autoResponderRule.update({
        where: { id: matchingRule.id },
        data: { triggerCount: { increment: 1 } },
      });

      // Update CRM lead stage if configured
      if (matchingRule.updateLeadStage) {
        await this.updateLeadStage(
          account.workspaceId,
          commentData.from?.id,
          fromName,
          matchingRule.updateLeadStage
        );
      }
    } catch (err: any) {
      this.logger.error('Error handling Facebook comment:', err?.message);
    }
  }

  private async handleFacebookDM(pageId: string, messagingEvent: any) {
    try {
      const senderId = messagingEvent.sender?.id;
      const messageText = messagingEvent.message?.text || '';
      const fromName = 'there';

      const account = await this.prisma.socialAccount.findFirst({
        where: { accountId: pageId, platform: 'FACEBOOK', isActive: true },
      });
      if (!account) return;

      const rules = await this.prisma.autoResponderRule.findMany({
        where: {
          workspaceId: account.workspaceId,
          platform: 'FACEBOOK',
          isActive: true,
          triggerType: { in: ['any_dm', 'keyword', 'first_message'] },
        },
      });

      const matchingRule = this.findMatchingRule(rules, messageText, 'dm');
      if (!matchingRule) return;

      const accessToken = this.decryptToken(account.accessToken!);
      const message = matchingRule.responseMessage.replace('{name}', fromName);

      await axios.post(
        `https://graph.facebook.com/v19.0/me/messages`,
        {
          recipient: { id: senderId },
          message: { text: message },
          access_token: accessToken,
        }
      );

      await this.prisma.autoResponderRule.update({
        where: { id: matchingRule.id },
        data: { triggerCount: { increment: 1 } },
      });
    } catch (err: any) {
      this.logger.error('Error handling Facebook DM:', err?.message);
    }
  }

  private async handleInstagramComment(igAccountId: string, commentData: any) {
    try {
      const commentId = commentData.id;
      const commentText = commentData.text || '';
      const fromName = commentData.from?.username || 'there';

      this.logger.log(`Instagram comment — accountId: ${igAccountId}, text: "${commentText}"`);

      const account = await this.prisma.socialAccount.findFirst({
        where: { accountId: igAccountId, platform: 'INSTAGRAM', isActive: true },
      });

      if (!account) {
        this.logger.warn(`No INSTAGRAM account found for id: ${igAccountId} — checking all IG accounts...`);
        const allIg = await this.prisma.socialAccount.findMany({
          where: { platform: 'INSTAGRAM' },
          select: { accountId: true, accountName: true, isActive: true },
        });
        this.logger.warn(`All IG accounts in DB: ${JSON.stringify(allIg)}`);
        return;
      }

      const rules = await this.prisma.autoResponderRule.findMany({
        where: {
          workspaceId: account.workspaceId,
          platform: 'INSTAGRAM',
          isActive: true,
        },
      });

      const matchingRule = this.findMatchingRule(rules, commentText, 'comment');
      if (!matchingRule) return;

      const accessToken = this.decryptToken(account.accessToken!);

      if (matchingRule.responseType === 'comment' || matchingRule.responseType === 'both') {
        const message = matchingRule.responseMessage.replace('{name}', fromName);
        await axios.post(
          `https://graph.facebook.com/v19.0/${commentId}/replies`,
          null,
          { params: { message, access_token: accessToken } }
        );
      }

      await this.prisma.autoResponderRule.update({
        where: { id: matchingRule.id },
        data: { triggerCount: { increment: 1 } },
      });
    } catch (err: any) {
      this.logger.error('Error handling Instagram comment:', err?.message);
      this.logger.error('Instagram API error detail:', JSON.stringify(err?.response?.data ?? err?.response ?? err));
      this.logger.error('Instagram API status:', err?.response?.status);
      this.logger.error('Instagram API full error:', JSON.stringify({
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      }));
    }
  }

  private async handleInstagramDM(igAccountId: string, messageData: any) {
    try {
      const senderId = messageData.sender?.id;
      const messageText = messageData.message?.text || '';

      const account = await this.prisma.socialAccount.findFirst({
        where: { accountId: igAccountId, platform: 'INSTAGRAM', isActive: true },
      });
      if (!account) return;

      const rules = await this.prisma.autoResponderRule.findMany({
        where: {
          workspaceId: account.workspaceId,
          platform: 'INSTAGRAM',
          isActive: true,
          triggerType: { in: ['any_dm', 'keyword', 'first_message'] },
        },
      });

      const matchingRule = this.findMatchingRule(rules, messageText, 'dm');
      if (!matchingRule) return;

      const accessToken = this.decryptToken(account.accessToken!);
      const message = matchingRule.responseMessage.replace('{name}', 'there');

      await axios.post(
        `https://graph.facebook.com/v19.0/me/messages`,
        {
          recipient: { id: senderId },
          message: { text: message },
          access_token: accessToken,
        }
      );

      await this.prisma.autoResponderRule.update({
        where: { id: matchingRule.id },
        data: { triggerCount: { increment: 1 } },
      });
    } catch (err: any) {
      this.logger.error('Error handling Instagram DM:', err?.message);
    }
  }

  private async handleInstagramDMByMid(igAccountId: string, mid: string) {
    try {
      const account = await this.prisma.socialAccount.findFirst({
        where: { accountId: igAccountId, platform: 'INSTAGRAM', isActive: true },
      });
      if (!account) {
        this.logger.warn(`handleInstagramDMByMid — no account found for ${igAccountId}`);
        return;
      }

      const accessToken = this.decryptToken(account.accessToken!);

      // Fetch message content using the message ID
      let messageText = '';
      let senderId = '';
      try {
        const msgRes = await axios.get(`https://graph.facebook.com/v19.0/${mid}`, {
          params: { fields: 'id,message,from,to', access_token: accessToken },
        });
        messageText = msgRes.data.message || '';
        senderId = msgRes.data.from?.id || '';
        this.logger.log(`Fetched DM content: "${messageText}" from senderId: ${senderId}`);
      } catch (fetchErr: any) {
        this.logger.error('Failed to fetch message content via mid:', JSON.stringify(fetchErr?.response?.data ?? fetchErr?.message));
        return;
      }

      // Skip echoes (message sent by own account)
      if (!senderId || senderId === igAccountId) {
        this.logger.log('Skipping — message is echo from own account');
        return;
      }

      const rules = await this.prisma.autoResponderRule.findMany({
        where: {
          workspaceId: account.workspaceId,
          platform: 'INSTAGRAM',
          isActive: true,
          triggerType: { in: ['any_dm', 'keyword', 'first_message'] },
        },
      });

      const matchingRule = this.findMatchingRule(rules, messageText, 'dm');
      if (!matchingRule) {
        this.logger.log(`No matching DM rule for message: "${messageText}"`);
        return;
      }

      const message = matchingRule.responseMessage.replace('{name}', 'there');

      this.logger.log(`Sending DM reply to ${senderId} via IG account ${igAccountId}`);
      this.logger.log(`Reply message: "${message}"`);

      await axios.post(
        `https://graph.facebook.com/v19.0/${igAccountId}/messages`,
        {
          recipient: { id: senderId },
          message: { text: message },
          access_token: accessToken,
        }
      );

      this.logger.log(`Instagram DM auto-reply sent to ${senderId} via rule: ${matchingRule.name}`);

      await this.prisma.autoResponderRule.update({
        where: { id: matchingRule.id },
        data: { triggerCount: { increment: 1 } },
      });
    } catch (err: any) {
      this.logger.error('Error in handleInstagramDMByMid:', err?.message);
      const detail = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message || String(err);
      this.logger.error('Detail:', detail);
      this.logger.error('Status:', err?.response?.status);
    }
  }

  private findMatchingRule(rules: any[], text: string, eventType: string): any {
    const lowerText = text.toLowerCase();

    // First check keyword rules
    const keywordRule = rules.find(r =>
      r.triggerType === 'keyword' &&
      r.keywords.some((kw: string) => lowerText.includes(kw.toLowerCase())) &&
      (r.responseType === eventType || r.responseType === 'both')
    );
    if (keywordRule) return keywordRule;

    // Then check any_comment or any_dm rules
    const anyRule = rules.find(r =>
      (r.triggerType === `any_${eventType}`) ||
      (r.triggerType === 'first_message')
    );
    return anyRule || null;
  }

  private async updateLeadStage(
    workspaceId: string,
    socialId: string,
    name: string,
    stage: string
  ) {
    try {
      const existing = await this.prisma.client.findFirst({
        where: { workspaceId, name: { contains: name } },
      });

      if (existing) {
        await this.prisma.client.update({
          where: { id: existing.id },
          data: { stage: stage as any },
        });
      }
    } catch (err) {
      this.logger.error('Failed to update lead stage:', err);
    }
  }

  private decryptToken(encryptedToken: string): string {
    try {
      const { createDecipheriv } = require('crypto');
      const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
      const [ivHex, encrypted] = encryptedToken.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    } catch {
      return encryptedToken;
    }
  }
}
