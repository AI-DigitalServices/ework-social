import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, InboxMessageType } from '@prisma/client';
import { createDecipheriv } from 'crypto';
import axios from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService) {}

  async processWebhookEvent(body: any) {
    const { object, entry } = body;
    if (object === 'page') {
      for (const pageEntry of entry) {
        const pageId = pageEntry.id;
        if (pageEntry.changes) {
          for (const change of pageEntry.changes) {
            if (change.field === 'feed' && change.value?.item === 'comment') {
              await this.handleFacebookComment(pageId, change.value);
            }
          }
        }
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
        if (igEntry.changes) {
          for (const change of igEntry.changes) {
            if (change.field === 'comments') {
              await this.handleInstagramComment(igEntry.id, change.value);
            }
            if (change.field === 'messages') {
              await this.handleInstagramDM(igEntry.id, change.value);
            }
          }
        }
        if (igEntry.messaging) {
          for (const messagingEvent of igEntry.messaging) {
            if (messagingEvent.message && !messagingEvent.message.is_echo) {
              await this.handleInstagramDM(igEntry.id, messagingEvent);
            }
            if (messagingEvent.message_edit && messagingEvent.message_edit.num_edit === 0) {
              await this.handleInstagramDMByMid(igEntry.id, messagingEvent.message_edit.mid);
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
      if (!account) {
        this.logger.warn(`Facebook comment webhook: no active SocialAccount found for pageId ${pageId} — event dropped`);
        return;
      }

      // Skip comments authored by the connected Page itself. Facebook
      // re-delivers the auto-responder's own posted replies through this
      // same webhook as if it were a brand-new comment — without this
      // guard, the bot's own reply gets saved as a fresh inbox item and
      // re-evaluated against auto-responder rules, causing a self-reply
      // loop and inbox spam. (DMs already avoid this via the is_echo flag;
      // comment webhooks have no equivalent, so this has to be explicit.)
      if (commentData.from?.id === pageId) {
        return;
      }

      // Resolve the commenter's profile picture — the webhook payload only
      // includes id/name, never a photo, so a follow-up Graph call is needed
      // (mirrors fetchInstagramProfile below, which Facebook never had).
      const commentProfile = commentData.from?.id && account.accessToken
        ? await this.fetchFacebookProfile(commentData.from.id, account.accessToken)
        : {};

      // Save to inbox. If this is a duplicate delivery, stop here — don't re-reply.
      const { isNew } = await this.saveInboxMessage({
        workspaceId: account.workspaceId,
        platform: Platform.FACEBOOK,
        type: InboxMessageType.COMMENT,
        externalId: commentId,
        senderId: commentData.from?.id,
        senderName: fromName,
        senderAvatar: commentProfile.avatar,
        content: commentText,
        postId: commentData.post_id,
        socialAccountId: account.id,
      });
      if (!isNew) return;

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

      // Record auto-reply in inbox so team sees it was handled and doesn't double-reply
      await this.recordAutoReply(Platform.FACEBOOK, commentId, matchingRule.responseMessage.replace('{name}', fromName));

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

      const account = await this.prisma.socialAccount.findFirst({
        where: { accountId: pageId, platform: 'FACEBOOK', isActive: true },
      });
      if (!account) {
        this.logger.warn(`Facebook DM webhook: no active SocialAccount found for pageId ${pageId} — event dropped`);
        return;
      }

      // Resolve the sender's real name + photo BEFORE saving — previously this
      // was hardcoded to "there" and only resolved *after* the inbox row was
      // already written, and even then only used for the CRM contact, never
      // fed back into the inbox message itself. That's why DMs showed "there"
      // with no photo while Instagram (which resolves profile first) didn't.
      let fromName = 'there';
      let senderAvatar: string | undefined;
      if (senderId && account.accessToken) {
        const profile = await this.fetchFacebookMessengerProfile(senderId, account.accessToken);
        if (profile.name) fromName = profile.name;
        senderAvatar = profile.avatar;
      }

      // Save to inbox. If this is a duplicate delivery, stop here — don't re-reply.
      const { isNew } = await this.saveInboxMessage({
        workspaceId: account.workspaceId,
        platform: Platform.FACEBOOK,
        type: InboxMessageType.DM,
        externalId: messagingEvent.message?.mid || senderId,
        senderId,
        senderName: fromName,
        senderAvatar,
        content: messageText,
        socialAccountId: account.id,
      });
      if (!isNew) return;

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

      // Record auto-reply in inbox so team sees it was handled and doesn't double-reply
      await this.recordAutoReply(Platform.FACEBOOK, messagingEvent.message?.mid || senderId, message);

      // Update CRM lead stage if the rule has that configured — reuse the name
      // already resolved above instead of making a second Graph API call.
      if (matchingRule.updateLeadStage && senderId) {
        await this.updateLeadStage(
          account.workspaceId,
          senderId,
          fromName,
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

      const account = await this.prisma.socialAccount.findFirst({
        where: { accountId: igAccountId, platform: 'INSTAGRAM', isActive: true },
      });
      if (!account) {
        this.logger.warn(`Instagram comment webhook: no active SocialAccount found for igAccountId ${igAccountId} — event dropped`);
        return;
      }

      // Skip comments authored by the connected Instagram account itself —
      // same self-reply-loop guard as handleFacebookComment above.
      if (commentData.from?.id === igAccountId) {
        return;
      }

      // Resolve the commenter's handle + photo so the inbox/CRM show a real
      // identity rather than a numeric ID.
      const profile = commentData.from?.id && account.accessToken
        ? await this.fetchInstagramProfile(commentData.from.id, account.accessToken)
        : {};
      const fromName = profile.name || commentData.from?.username || 'there';

      // Save to inbox. If this is a duplicate delivery, stop here — don't re-reply.
      const { isNew } = await this.saveInboxMessage({
        workspaceId: account.workspaceId,
        platform: Platform.INSTAGRAM,
        type: InboxMessageType.COMMENT,
        externalId: commentId,
        senderId: commentData.from?.id,
        senderName: fromName,
        senderAvatar: profile.avatar,
        content: commentText,
        socialAccountId: account.id,
      });
      if (!isNew) return;

      const rules = await this.prisma.autoResponderRule.findMany({
        where: {
          workspaceId: account.workspaceId,
          platform: 'INSTAGRAM',
          isActive: true,
        },
      });

      const matchingRule = this.findMatchingRule(rules, commentText, 'comment');
      if (!matchingRule) {
        this.logger.log(`IG comment: no matching auto-responder rule for "${commentText.slice(0, 40)}"`);
        return;
      }

      const accessToken = this.decryptToken(account.accessToken!);

      if (matchingRule.responseType === 'comment' || matchingRule.responseType === 'both') {
        const message = matchingRule.responseMessage.replace('{name}', fromName);
        try {
          await axios.post(
            `https://graph.facebook.com/v19.0/${commentId}/replies`,
            null,
            { params: { message, access_token: accessToken } }
          );
          this.logger.log(`IG comment auto-reply sent for ${commentId}`);
        } catch (replyErr: any) {
          // Replying to IG comments requires instagram_manage_comments — if that
          // scope isn't granted yet, this is where it fails.
          this.logger.error(
            `IG comment reply failed (needs instagram_manage_comments?): ${JSON.stringify(replyErr?.response?.data ?? replyErr?.message)}`,
          );
        }
      }

      if (matchingRule) {
        await this.prisma.autoResponderRule.update({
          where: { id: matchingRule.id },
          data: { triggerCount: { increment: 1 } },
        });
      }

      // Record auto-reply in inbox so team sees it was handled and doesn't double-reply
      await this.recordAutoReply(Platform.INSTAGRAM, commentId, matchingRule.responseMessage.replace('{name}', fromName));

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
      if (!account) {
        this.logger.warn(`Instagram DM webhook: no active SocialAccount found for igAccountId ${igAccountId} — event dropped`);
        return;
      }

      const externalId = messageData.message?.mid || senderId;

      // Fetch the sender's Instagram profile (handle + picture) so the inbox and
      // CRM show a real name/photo instead of the numeric ID.
      const profile = senderId && account.accessToken
        ? await this.fetchInstagramProfile(senderId, account.accessToken)
        : {};
      const senderName = profile.name || messageData.sender?.username || senderId;
      const senderAvatar = profile.avatar;

      // Save to inbox. If this is a duplicate delivery, stop here — don't re-reply.
      const { isNew } = await this.saveInboxMessage({
        workspaceId: account.workspaceId,
        platform: Platform.INSTAGRAM,
        type: InboxMessageType.DM,
        externalId,
        senderId,
        senderName,
        senderAvatar,
        content: messageText,
        socialAccountId: account.id,
      });
      if (!isNew) return;

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
        this.logger.log(`IG DM: saved to inbox but no matching auto-responder rule (${rules.length} active rule(s))`);
        return;
      }

      const accessToken = this.decryptToken(account.accessToken!);
      const message = matchingRule.responseMessage.replace('{name}', senderName);

      try {
        const sendRes = await axios.post(
          `https://graph.facebook.com/v19.0/me/messages`,
          {
            recipient: { id: senderId },
            message: { text: message },
            access_token: accessToken,
          }
        );
        // Log the API response — a `message_id` here means Instagram accepted and
        // delivered it. If replies "send" but don't appear natively, this confirms
        // whether the issue is on our side or Instagram's delivery/policy side.
        this.logger.log(`IG DM auto-reply sent to ${senderId} — response: ${JSON.stringify(sendRes.data)}`);
      } catch (replyErr: any) {
        // Log but don't throw — a failed auto-reply must not block CRM/inbox updates.
        this.logger.error(
          `IG DM reply failed: ${JSON.stringify(replyErr?.response?.data ?? replyErr?.message)}`,
        );
      }

      if (matchingRule) {
        await this.prisma.autoResponderRule.update({
          where: { id: matchingRule.id },
          data: { triggerCount: { increment: 1 } },
        });

        // Record auto-reply in inbox so team sees it was handled and doesn't double-reply
        await this.recordAutoReply(Platform.INSTAGRAM, messageData.message?.mid || senderId, matchingRule.responseMessage.replace('{name}', 'there'));

        // Update CRM lead stage if the rule has that configured — use the
        // resolved handle (not the numeric IGSID) so contacts are readable.
        if (matchingRule.updateLeadStage && senderId) {
          await this.updateLeadStage(
            account.workspaceId,
            senderId,
            senderName,
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
      if (!account) return;

      const accessToken = this.decryptToken(account.accessToken!);

      // Fetch message content using the message ID
      let messageText = '';
      let senderId = '';
      let senderUsername = '';
      try {
        const msgRes = await axios.get(`https://graph.facebook.com/v19.0/${mid}`, {
          params: { fields: 'id,message,from,to', access_token: accessToken },
        });
        messageText = msgRes.data.message || '';
        senderId = msgRes.data.from?.id || '';
        senderUsername = msgRes.data.from?.username || senderId;
      } catch (fetchErr: any) {
        this.logger.error('ByMid fetch failed:', JSON.stringify(fetchErr?.response?.data ?? fetchErr?.message));
        return;
      }

      // Skip echoes (own account sending)
      if (!senderId || senderId === igAccountId) return;

      // Save to inbox — auto-reply is handled by the full `message` event that follows
      await this.saveInboxMessage({
        workspaceId: account.workspaceId,
        platform: Platform.INSTAGRAM,
        type: InboxMessageType.DM,
        externalId: mid,
        senderId,
        senderName: senderUsername,
        content: messageText,
        socialAccountId: account.id,
      });
    } catch (err: any) {
      this.logger.error(`handleInstagramDMByMid error: ${err?.message}`);
    }
  }

  /**
   * Fetch a Facebook user's public name + profile picture from their PSID, so
   * the inbox shows a real name/photo instead of "there"/no image. Mirrors
   * fetchInstagramProfile below — Facebook never had an equivalent, which is
   * why DM/comment sender identity wasn't resolving. Logs the exact Graph API
   * error on failure so we can diagnose why a profile didn't resolve.
   */
  private async fetchFacebookProfile(
    userId: string,
    encryptedToken: string,
  ): Promise<{ name?: string; avatar?: string }> {
    try {
      const token = this.decryptToken(encryptedToken);
      const res = await axios.get(`https://graph.facebook.com/v19.0/${userId}`, {
        params: { fields: 'name,picture.type(large)', access_token: token },
      });
      return {
        name: res.data?.name,
        avatar: res.data?.picture?.data?.url,
      };
    } catch (err: any) {
      this.logger.warn(
        `Facebook profile fetch failed for ${userId}: ${JSON.stringify(err?.response?.data ?? err?.message)}`,
      );
      return {};
    }
  }

  /**
   * Fetch a Messenger sender's name + photo via Meta's User Profile API. A
   * Messenger PSID is NOT a regular Graph API user/page node — the 'name'
   * and 'picture.type(large)' fields used by fetchFacebookProfile above (for
   * comment authors, which ARE regular nodes) throw a hard
   * GraphMethodException (code 100, subcode 33) against a PSID instead of
   * degrading gracefully. The documented fields for this endpoint are
   * first_name/last_name/profile_pic — see
   * developers.facebook.com/docs/messenger-platform/identity/user-profile.
   * Per that doc, an empty object (not an error) is returned if the person
   * never opted in (no Get Started tap / button / direct message) — that's
   * expected and falls back to the caller's default name, not a bug.
   */
  private async fetchFacebookMessengerProfile(
    userId: string,
    encryptedToken: string,
  ): Promise<{ name?: string; avatar?: string }> {
    try {
      const token = this.decryptToken(encryptedToken);
      const res = await axios.get(`https://graph.facebook.com/v19.0/${userId}`, {
        params: { fields: 'first_name,last_name,profile_pic', access_token: token },
      });
      const name = [res.data?.first_name, res.data?.last_name].filter(Boolean).join(' ') || undefined;
      return {
        name,
        avatar: res.data?.profile_pic,
      };
    } catch (err: any) {
      this.logger.warn(
        `Facebook Messenger profile fetch failed for ${userId}: ${JSON.stringify(err?.response?.data ?? err?.message)}`,
      );
      return {};
    }
  }

  /**
   * Fetch an Instagram user's public profile (handle + picture) from their IGSID,
   * so the inbox shows a real name/photo instead of the numeric ID. Requires
   * instagram_manage_messages. Logs the exact Graph API error on failure so we
   * can diagnose why a profile didn't resolve (permissions, privacy, etc.).
   */
  private async fetchInstagramProfile(
    userId: string,
    encryptedToken: string,
  ): Promise<{ name?: string; avatar?: string }> {
    try {
      const token = this.decryptToken(encryptedToken);
      const res = await axios.get(`https://graph.facebook.com/v19.0/${userId}`, {
        params: { fields: 'name,username,profile_pic', access_token: token },
      });
      return {
        name: res.data?.username || res.data?.name,
        avatar: res.data?.profile_pic,
      };
    } catch (err: any) {
      this.logger.warn(
        `IG profile fetch failed for ${userId}: ${JSON.stringify(err?.response?.data ?? err?.message)}`,
      );
      return {};
    }
  }

  private async saveInboxMessage(data: {
    workspaceId: string;
    platform: Platform;
    type: InboxMessageType;
    externalId: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    content: string;
    postId?: string;
    postContent?: string;
    socialAccountId?: string;
  }): Promise<{ isNew: boolean }> {
    // Idempotent insert: Meta delivers each webhook more than once, so we rely on
    // the (platform, externalId) unique constraint as the single source of truth.
    // Attempt the INSERT directly (text→enum cast is fine in INSERT); a P2002
    // unique-constraint error means this exact event was already saved by an
    // earlier/concurrent delivery — return isNew:false so the caller skips the
    // duplicate auto-reply. This is what stops the "responses sent twice" problem.
    try {
      await this.prisma.inboxMessage.create({
        data: {
          workspaceId: data.workspaceId,
          platform: data.platform,
          type: data.type,
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
      return { isNew: true };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // Duplicate delivery — already have this event. Not an error.
        return { isNew: false };
      }
      this.logger.error('Failed to save inbox message:', err?.message);
      return { isNew: false };
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

      }
    } catch (err) {
      this.logger.error('Failed to update lead stage:', err);
    }
  }

  /**
   * After an auto-responder fires, record the reply in the InboxReply table
   * and mark the message as read. We deliberately leave isResolved=false so
   * the team can still see it, review the auto-reply, and optionally follow up —
   * without accidentally sending a duplicate response.
   */
  private async recordAutoReply(
    platform: Platform,
    externalId: string,
    responseContent: string,
  ): Promise<void> {
    try {
      // NOTE: Same Prisma/PG enum cast workaround — find by externalId only, no enum in WHERE
      const msg = await this.prisma.inboxMessage.findFirst({
        where: { externalId },
      });
      if (!msg) return;

      // Record the auto-reply so the inbox shows it was already handled
      await this.prisma.inboxReply.create({
        data: {
          messageId: msg.id,
          content: responseContent,
          sentBy: null,   // null = system / auto-responder (sentBy is nullable)
          isAuto: true,
        },
      });

      // Mark read (system processed it) but leave isResolved=false so team can review
      await this.prisma.inboxMessage.update({
        where: { id: msg.id },
        data: { isRead: true },
      });

    } catch (err: any) {
      // Non-fatal — auto-reply was sent; failure here is just an inbox recording issue
      this.logger.error('Failed to record auto-reply in inbox:', err?.message);
    }
  }

  private decryptToken(encryptedToken: string): string {
    try {
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
