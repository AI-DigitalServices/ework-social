import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { getPlanLimits, getPlanDisplayName } from '../common/plan-limits';
import { WEBHOOK_EVENTS } from './webhook-events';
import { assertPublicHost, validateWebhookUrl } from './webhook-url.util';

// The events a workspace can subscribe to live in webhook-events.ts. Re-exported
// here so existing imports keep working.
export { WEBHOOK_EVENTS };
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const MAX_HOOKS_PER_WORKSPACE = 10;

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
    const check = validateWebhookUrl(url);
    if (!check.ok) throw new BadRequestException(check.reason);

    const valid = (events || []).filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
    if (valid.length === 0) {
      throw new BadRequestException(`Select at least one event: ${WEBHOOK_EVENTS.join(', ')}`);
    }

    const existing = await this.prisma.workspaceWebhook.count({ where: { workspaceId } });
    if (existing >= MAX_HOOKS_PER_WORKSPACE) {
      throw new BadRequestException(`You can have up to ${MAX_HOOKS_PER_WORKSPACE} webhooks. Delete one to add another.`);
    }

    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    const hook = await this.prisma.workspaceWebhook.create({
      data: { workspaceId, url: check.url!.toString(), events: valid, secret },
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
    const updated = await this.prisma.workspaceWebhook.update({ where: { id }, data: { enabled } });
    // Do not echo the signing secret back.
    return {
      id: updated.id,
      url: updated.url,
      events: updated.events,
      enabled: updated.enabled,
      lastStatus: updated.lastStatus,
      lastFiredAt: updated.lastFiredAt,
    };
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

  /**
   * Envelope: { id, event, workspaceId, createdAt, firedAt, data }.
   * `id` is unique per delivery (use it to ignore duplicates); the signature is
   * HMAC-SHA256 of the raw body. `firedAt` is kept for older receivers.
   */
  private async deliver(
    hook: { id: string; url: string; secret: string; workspaceId?: string },
    event: string,
    payload: Record<string, any>,
  ): Promise<number> {
    const now = new Date().toISOString();
    const deliveryId = `evt_${randomBytes(12).toString('hex')}`;
    const body = JSON.stringify({
      id: deliveryId,
      event,
      workspaceId: hook.workspaceId,
      createdAt: now,
      firedAt: now,
      data: payload,
    });
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex');
    let status = 0;
    try {
      await assertPublicHost(new URL(hook.url).hostname);
      const res = await axios.post(hook.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'eWorkSocial-Webhooks/1.0',
          'X-EWork-Event': event,
          'X-EWork-Delivery': deliveryId,
          'X-EWork-Timestamp': now,
          'X-EWork-Signature': `sha256=${signature}`,
        },
        timeout: 10000,
        maxRedirects: 0,
        maxContentLength: 1_000_000,
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
