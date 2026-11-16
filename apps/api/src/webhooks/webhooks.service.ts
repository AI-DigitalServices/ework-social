import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { getPlanLimits, getPlanDisplayName } from '../common/plan-limits';

// The events a workspace can subscribe to. Keep this list in sync with the
// dispatch() calls sprinkled across the app.
export const WEBHOOK_EVENTS = [
  'post.published',
  'post.failed',
  'lead.created',
  'inbox.message',
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
  ) {}

  async list(workspaceId: string) {
    const hooks = await this.prisma.workspaceWebhook.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    // Never leak the full signing secret — only a short hint.
    return hooks.map((h) => ({
      id: h.id,
      url: h.url,
      events: h.events,
      enabled: h.enabled,
      lastStatus: h.lastStatus,
      lastFiredAt: h.lastFiredAt,
      secretHint: h.secret.slice(0, 8),
    }));
  }

  async create(workspaceId: string, url: string, events: string[]) {
    // Premium gate — automation/integrations unlock at Growth+.
    const plan = await this.planGuard.getWorkspacePlan(workspaceId);
    if (!getPlanLimits(plan).automationEnabled) {
      throw new ForbiddenException(
        `Webhooks are available on the Growth plan and above. Your ${getPlanDisplayName(plan)} plan doesn't include them yet — upgrade to connect Zapier, Make, or n8n.`,
      );
    }
    if (!url || !/^https:\/\//i.test(url)) {
      throw new BadRequestException('A valid https:// URL is required.');
    }
    const valid = (events || []).filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
    if (valid.length === 0) {
      throw new BadRequestException(`Select at least one event: ${WEBHOOK_EVENTS.join(', ')}`);
    }
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    const hook = await this.prisma.workspaceWebhook.create({
      data: { workspaceId, url, events: valid, secret },
    });
    return { id: hook.id, url: hook.url, events: hook.events, enabled: hook.enabled, secret };
  }

  async remove(workspaceId: string, id: string) {
    const hook = await this.prisma.workspaceWebhook.findUnique({ where: { id } });
    if (!hook || hook.workspaceId !== workspaceId) throw new NotFoundException('Webhook not found.');
    await this.prisma.workspaceWebhook.delete({ where: { id } });
    return { id, deleted: true };
  }

  async setEnabled(workspaceId: string, id: string, enabled: boolean) {
    const hook = await this.prisma.workspaceWebhook.findUnique({ where: { id } });
    if (!hook || hook.workspaceId !== workspaceId) throw new NotFoundException('Webhook not found.');
    return this.prisma.workspaceWebhook.update({ where: { id }, data: { enabled } });
  }

  /** Send a test ping to one webhook so the user can confirm wiring. */
  async sendTest(workspaceId: string, id: string) {
    const hook = await this.prisma.workspaceWebhook.findUnique({ where: { id } });
    if (!hook || hook.workspaceId !== workspaceId) throw new NotFoundException('Webhook not found.');
    const status = await this.deliver(hook, 'webhook.test', { message: 'This is a test event from eWork Social.' });
    return { delivered: status >= 200 && status < 300, status };
  }

  /**
   * Fire an event to every enabled webhook in a workspace that subscribes to it.
   * Best-effort and fire-and-forget: never throws into the caller's path, so an
   * unreachable endpoint can't break publishing, CRM, or inbox handling.
   */
  async dispatch(workspaceId: string, event: WebhookEvent, payload: Record<string, any>) {
    let hooks: any[];
    try {
      hooks = await this.prisma.workspaceWebhook.findMany({
        where: { workspaceId, enabled: true, events: { has: event } },
      });
    } catch (err: any) {
      // Table may not exist yet (pre-migration) — silently skip.
      return;
    }
    for (const hook of hooks) {
      this.deliver(hook, event, payload).catch(() => {});
    }
  }

  private async deliver(hook: { id: string; url: string; secret: string }, event: string, payload: Record<string, any>): Promise<number> {
    const body = JSON.stringify({ event, firedAt: new Date().toISOString(), data: payload });
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex');
    let status = 0;
    try {
      const res = await axios.post(hook.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-EWork-Event': event,
          'X-EWork-Signature': `sha256=${signature}`,
        },
        timeout: 10000,
        validateStatus: () => true,
      });
      status = res.status;
    } catch (err: any) {
      this.logger.warn(`Webhook ${hook.id} delivery failed: ${err.message}`);
      status = 0;
    }
    try {
      await this.prisma.workspaceWebhook.update({
        where: { id: hook.id },
        data: { lastStatus: status, lastFiredAt: new Date() },
      });
    } catch {
      /* non-critical */
    }
    return status;
  }
}
