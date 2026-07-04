import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService) {}

  async processWebhookEvent(body: any) {
    const { object, entry } = body;
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

      // Always save to inbox — every comment lands here regardless of auto-responder rules
      await this.saveInboxMessage({
        workspaceId: account.workspaceId,
        platform: 'FACEBOOK',
        type: 'COMMENT',
        externalId: commentId,
        senderId: commentData.from?.id,
        senderName: fromName,
        content: commentText,
        postId: commentData.post_id,
        socialAccountId: account.id,
      });

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
      if (matchingRule) {
        await this.prisma.autoResponderRule.update({
          where: { id: matchingRule.id },
          data: { triggerCount: { increment: 1 } },
        });
      }

      // Update CRM lead stage if configured
      if (matchingRule?.updateLeadStage) {
        await this.updateLeadStage(
          account.workspaceId,
          commentData.from?.id,
          fromName,
          matchingRule.updateLeadStage,
          'FACEBOOK_COMMENT',
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

      // Always save to inbox first — every DM lands here
      await this.saveInboxMessage({
        workspaceId: account.workspaceId,
        platform: 'FACEBOOK',
        type: 'DM',
        externalId: messagingEvent.message?.mid || senderId,
        senderId,
        senderName: fromName,
        content: messageText,
        socialAccountId: account.id,
      });

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

      if (matchingRule) {
        await this.prisma.autoResponderRule.update({
          where: { id: matchingRule.id },
          data: { triggerCount: { increment: 1 } },
        });
      }

      // Try to get sender's name from Facebook Graph API for better CRM contact naming
      let senderName = `Facebook User ${senderId}`;
      try {
        const profileRes = await axios.get(
          `https://graph.facebook.com/v19.0/${senderId}`,
          { params: { fields: 'name', access_token: accessToken } }
        );
        if (profileRes.data?.name) senderName = profileRes.data.name;
      } catch {
        // enrichment failed — use fallback name, don't block CRM write
      }

      // Update CRM lead stage if the rule has that configured
      if (matchingRule.updateLeadStage && senderId) {
        await this.updateLeadStage(
          account.workspaceId,
          senderId,
          senderName,
          matchingRule.updateLeadStage,
          'FACEBOOK_DM',
        );
      }
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
        this.logger.warn(`No INSTAGRAM account found for id: ${igAccountId}`);
        return;
      }

      // Always save to inbox — every comment regardless of rule match
      await this.saveInboxMessage({
        workspaceId: account.workspaceId,
        platform: 'INSTAGRAM',
        type: 'COMMENT',
        externalId: commentId,
        senderId: commentData.from?.id,
        senderName: fromName,
        content: commentText,
        socialAccountId: account.id,
      });

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

      if (matchingRule) {
        await this.prisma.autoResponderRule.update({
          where: { id: matchingRule.id },
          data: { triggerCount: { increment: 1 } },
        });
      }

      // Update CRM lead stage if the rule has that configured
      if (matchingRule?.updateLeadStage && commentData.from?.id) {
        await this.updateLeadStage(
          account.workspaceId,
          commentData.from.id,
          fromName,
          matchingRule.updateLeadStage,
          'INSTAGRAM_COMMENT',
          accessToken,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Instagram comment error — status: ${err?.response?.status}, message: ${err?.message}`,
      );
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

      // Always save to inbox — every DM regardless of auto-responder rule match
      await this.saveInboxMessage({
        workspaceId: account.workspaceId,
        platform: 'INSTAGRAM',
        type: 'DM',
        externalId: messageData.message?.mid || senderId,
        senderId,
        senderName: messageData.sender?.username || senderId,
        content: messageText,
        socialAccountId: account.id,
      });

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

      if (matchingRule) {
        await this.prisma.autoResponderRule.update({
          where: { id: matchingRule.id },
          data: { triggerCount: { increment: 1 } },
        });

        // Update CRM lead stage if the rule has that configured
        if (matchingRule.updateLeadStage && senderId) {
          await this.updateLeadStage(
            account.workspaceId,
            senderId,
            senderId,
            matchingRule.updateLeadStage,
            'INSTAGRAM_DM',
            accessToken,
          );
        }
      }
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

      // Per Meta docs: Instagram DM sending via Messenger Platform requires Facebook Page ID,
      // not the IG account ID. Look up the linked FB page account for this workspace.
      const fbAccount = await this.prisma.socialAccount.findFirst({
        where: { workspaceId: account.workspaceId, platform: 'FACEBOOK', isActive: true },
      });
      const pageId = fbAccount?.accountId ?? igAccountId;
      this.logger.log(`Sending DM reply to ${senderId} via Page ID: ${pageId}`);
      this.logger.log(`Reply message: "${message}"`);

      const payload = {
        recipient: { id: senderId },
        message: { text: message },
        messaging_type: 'RESPONSE',
        access_token: accessToken,
      };

      const sendRes = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/messages`,
        payload
      );
      this.logger.log(`Instagram DM auto-reply sent — response: ${JSON.stringify(sendRes.data)}`);

      await this.prisma.autoResponderRule.update({
        where: { id: matchingRule.id },
        data: { triggerCount: { increment: 1 } },
      });

      // Update CRM lead stage if the rule has that configured
      if (matchingRule.updateLeadStage) {
        await this.updateLeadStage(
          account.workspaceId,
          senderId,
          senderId,
          matchingRule.updateLeadStage,
          'INSTAGRAM_DM',
          accessToken,
        );
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const data = JSON.stringify(err?.response?.data ?? '(empty)');
      const msg = err?.message;
      this.logger.error(`handleInstagramDMByMid FAILED — status: ${status}, message: ${msg}, data: ${data}`);
    }
  }

  private async saveInboxMessage(data: {
    workspaceId: string;
    platform: string;
    type: string;
    externalId: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    content: string;
    postId?: string;
    postContent?: string;
    socialAccountId?: string;
  }) {
    try {
      await this.prisma.inboxMessage.upsert({
        where: {
          platform_externalId: {
            platform: data.platform as any,
            externalId: data.externalId,
          },
        },
        update: {
          content: data.content,
          senderName: data.senderName,
        },
        create: {
          workspaceId: data.workspaceId,
          platform: data.platform as any,
          type: data.type as any,
          externalId: data.externalId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          content: data.content,
          postId: data.postId,
          postContent: data.postContent,
          socialAccountId: data.socialAccountId,
        },
      });
      this.logger.log(`Inbox: saved ${data.type} from ${data.platform} — ${data.senderName}`);
    } catch (err: any) {
      this.logger.error('Failed to save inbox message:', err?.message);
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
    stage: string,
    source: 'INSTAGRAM_DM' | 'INSTAGRAM_COMMENT' | 'FACEBOOK_DM' | 'FACEBOOK_COMMENT' = 'INSTAGRAM_DM',
    accessToken?: string,
  ) {
    try {
      const tag = `ig:${socialId}`;

      // Try to find existing client by social ID tag first, then by name
      let existing = await this.prisma.client.findFirst({
        where: { workspaceId, tags: { has: tag } },
      });

      if (!existing && name && name !== 'Instagram DM') {
        existing = await this.prisma.client.findFirst({
          where: { workspaceId, name: { contains: name } },
        });
      }

      if (existing) {
        const prevStage = existing.stage;
        const updatedTags = existing.tags.includes(tag)
          ? existing.tags
          : [...existing.tags, tag];
        await this.prisma.client.update({
          where: { id: existing.id },
          data: {
            stage: stage as any,
            tags: updatedTags,
            lastContactedAt: new Date(),
          },
        });
        // Log stage change activity
        if (prevStage !== stage) {
          await this.prisma.activity.create({
            data: {
              clientId: existing.id,
              type: 'STAGE_CHANGED',
              description: `Stage updated from ${prevStage} to ${stage} via auto-responder`,
              metadata: { from: prevStage, to: stage, trigger: source },
            },
          });
        }
        // Log DM/comment activity
        await this.prisma.activity.create({
          data: {
            clientId: existing.id,
            type: source.includes('DM') ? 'DM_RECEIVED' : 'COMMENT_RECEIVED',
            description: `Auto-responder triggered by ${source.toLowerCase().replace('_', ' ')}`,
            metadata: { source, socialId },
          },
        });
        this.logger.log(`CRM: updated existing lead "${existing.name}" to stage ${stage}`);
      } else {
        // Attempt contact enrichment via Graph API
        let displayName = name && name !== 'Instagram DM' ? name : `Instagram User ${socialId}`;
        let socialProfiles: Record<string, any> = { instagram: { id: socialId } };

        if (accessToken && source.startsWith('INSTAGRAM')) {
          try {
            const profileRes = await axios.get(
              `https://graph.facebook.com/v19.0/${socialId}`,
              { params: { fields: 'name,username,profile_picture_url', access_token: accessToken } }
            );
            const profile = profileRes.data;
            if (profile.name) displayName = profile.name;
            socialProfiles = {
              instagram: {
                id: socialId,
                username: profile.username,
                profilePictureUrl: profile.profile_picture_url,
              },
            };
            this.logger.log(`CRM: enriched lead — name: "${displayName}", username: @${profile.username}`);
          } catch (enrichErr: any) {
            this.logger.warn(`CRM: enrichment failed for ${socialId}: ${enrichErr?.message}`);
          }
        }

        const newClient = await this.prisma.client.create({
          data: {
            workspaceId,
            name: displayName,
            stage: stage as any,
            source: source as any,
            tags: [tag, 'instagram', 'auto-responder'],
            socialProfiles,
            lastContactedAt: new Date(),
          },
        });

        // Log creation activity
        await this.prisma.activity.create({
          data: {
            clientId: newClient.id,
            type: 'CREATED',
            description: `Lead created automatically via ${source.toLowerCase().replace(/_/g, ' ')}`,
            metadata: { source, socialId },
          },
        });

        this.logger.log(`CRM: created new lead "${displayName}" at stage ${stage}`);
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
