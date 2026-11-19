import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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

/** Wait before retry 1, 2, 3 ... (first attempt is immediate). 6 attempts in total. */
export const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 6 * 3_600_000];
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
const CLAIM_LOCK_MS = 5 * 60_000;
const RETENTION_DAYS = 14;

export type DeliveryState = 'SUCCESS' | 'RETRYING' | 'FAILED';
type AttemptResult = { status: number; error: string | null; durationMs: number; permanent?: boolean };

/** Network error, timeout, 408, 429 and 5xx are worth retrying; other 4xx mean the receiver said no. */
export function isRetryable(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

export function decideNext(
  attempts: number,
  res: { status: number; permanent?: boolean },
  canRetry: boolean,
  now: number = Date.now(),
): { state: DeliveryState; nextRetryAt: Date | null } {
  if (res.status >= 200 && res.status < 300) return { state: 'SUCCESS', nextRetryAt: null };
  if (!canRetry || res.permanent || !isRetryable(res.status) || attempts >= MAX_ATTEMPTS) {
    return { state: 'FAILED', nextRetryAt: null };
  }
  return { state: 'RETRYING', nextRetryAt: new Date(now + RETRY_DELAYS_MS[attempts - 1]) };
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private processing = false;

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

  /** Send a test ping to one webhook so the user can confirm wiring. Tests are logged but never retried. */
  async sendTest(workspaceId: string, id: string) {
    const hook = await this.prisma.workspaceWebhook.findUnique({ where: { id } });
    if (!hook || hook.workspaceId !== workspaceId) throw new NotFoundException('Webhook not found.');
    const status = await this.deliver(hook, 'webhook.test', { message: 'This is a test event from eWork Social.' });
    return { delivered: status >= 200 && status < 300, status };
  }

  /** Recent deliveries for one webhook (newest first). The stored body is never returned. */
  async listDeliveries(workspaceId: string, hookId: string, limit?: number | string) {
    const hook = await this.prisma.workspaceWebhook.findUnique({ where: { id: hookId } });
    if (!hook || hook.workspaceId !== workspaceId) throw new NotFoundException('Webhook not found.');
    const take = Math.min(Math.max(Number(limit) || 25, 1), 100);
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId: hookId, workspaceId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        event: true,
        status: true,
        state: true,
        attempts: true,
        error: true,
        durationMs: true,
        nextRetryAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /** Send a past delivery again, with the same id and body, so receivers can de-duplicate. */
  async redeliver(workspaceId: string, hookId: string, deliveryId: string) {
    const hook = await this.prisma.workspaceWebhook.findUnique({ where: { id: hookId } });
    if (!hook || hook.workspaceId !== workspaceId) throw new NotFoundException('Webhook not found.');
    const row = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, webhookId: hookId, workspaceId },
    });
    if (!row) throw new NotFoundException('Delivery not found.');
    if (row.state === 'RETRYING') {
      throw new BadRequestException('This delivery is still being retried automatically.');
    }
    const attempts = row.attempts + 1;
    const res = await this.attempt(hook, row.id, row.event, row.body, attempts);
    const ok = res.status >= 200 && res.status < 300;
    await this.safe(() =>
      this.prisma.webhookDelivery.update({
        where: { id: row.id },
        data: {
          status: res.status,
          state: ok ? 'SUCCESS' : 'FAILED',
          attempts,
          error: res.error,
          durationMs: res.durationMs,
          nextRetryAt: null,
        },
      }),
    );
    await this.touchHook(hook.id, res.status);
    return { delivered: ok, status: res.status };
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

  // ── Retry worker ─────────────────────────────────────────────────────────

  /** Every minute: resend deliveries whose retry time has come. DB-backed, so a restart loses nothing. */
  @Cron('* * * * *')
  async processRetries() {
    if (this.processing) return;
    this.processing = true;
    try {
      let due: any[];
      try {
        due = await this.prisma.webhookDelivery.findMany({
          where: { state: 'RETRYING', nextRetryAt: { lte: new Date() } },
          orderBy: { nextRetryAt: 'asc' },
          take: 25,
        });
      } catch {
        return; // table not migrated yet
      }
      await Promise.all(due.map((row) => this.retryOne(row).catch((e) => this.logger.warn(`Retry failed: ${e?.message}`))));
    } finally {
      this.processing = false;
    }
  }

  /** Daily: drop delivery logs older than the retention window. */
  @Cron('17 3 * * *')
  async purgeOldDeliveries() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
    await this.safe(() => this.prisma.webhookDelivery.deleteMany({ where: { createdAt: { lt: cutoff } } }));
  }

  async retryOne(row: any) {
    // Claim the row. A second instance (or an overlapping run) loses this race and skips it.
    // If we crash mid-send the lock simply expires and the row comes due again.
    const claim = await this.prisma.webhookDelivery.updateMany({
      where: { id: row.id, state: 'RETRYING', nextRetryAt: row.nextRetryAt },
      data: { nextRetryAt: new Date(Date.now() + CLAIM_LOCK_MS) },
    });
    if (claim.count !== 1) return;

    const hook = await this.prisma.workspaceWebhook.findUnique({ where: { id: row.webhookId } });
    if (!hook || !hook.enabled) {
      await this.prisma.webhookDelivery.update({
        where: { id: row.id },
        data: { state: 'FAILED', nextRetryAt: null, error: 'Webhook was removed or disabled before this retry.' },
      });
      return;
    }

    const attempts = row.attempts + 1;
    const res = await this.attempt(hook, row.id, row.event, row.body, attempts);
    const next = decideNext(attempts, res, true);
    await this.prisma.webhookDelivery.update({
      where: { id: row.id },
      data: {
        status: res.status,
        state: next.state,
        attempts,
        error: res.error,
        durationMs: res.durationMs,
        nextRetryAt: next.nextRetryAt,
      },
    });
    await this.touchHook(hook.id, res.status);
  }

  // ── Delivery ─────────────────────────────────────────────────────────────

  /**
   * Envelope: { id, event, workspaceId, createdAt, firedAt, data }.
   * `id` is unique per delivery and stays the same across retries (use it to
   * ignore duplicates); the signature is HMAC-SHA256 of the raw body.
   * `firedAt` is kept for older receivers.
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

    const res = await this.attempt(hook, deliveryId, event, body, 1);
    const next = decideNext(1, res, event !== 'webhook.test');

    // Log it. Never let logging break delivery (or the caller).
    await this.safe(() =>
      this.prisma.webhookDelivery.create({
        data: {
          id: deliveryId,
          webhookId: hook.id,
          workspaceId: hook.workspaceId as string,
          event,
          body,
          status: res.status,
          state: next.state,
          attempts: 1,
          error: res.error,
          durationMs: res.durationMs,
          nextRetryAt: next.nextRetryAt,
        },
      }),
    );
    await this.touchHook(hook.id, res.status);
    return res.status;
  }

  /** One HTTP attempt. Never throws. */
  private async attempt(
    hook: { id: string; url: string; secret: string },
    deliveryId: string,
    event: string,
    body: string,
    attemptNo: number,
  ): Promise<AttemptResult> {
    const started = Date.now();
    let createdAt = new Date().toISOString();
    try {
      createdAt = JSON.parse(body).createdAt || createdAt;
    } catch {
      /* keep fallback */
    }
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex');

    try {
      await assertPublicHost(new URL(hook.url).hostname);
    } catch (err: any) {
      const message = String(err?.message || 'Blocked');
      this.logger.warn(`Webhook ${hook.id} delivery failed: ${message}`);
      return {
        status: 0,
        error: message.slice(0, 300),
        durationMs: Date.now() - started,
        permanent: /block/i.test(message),
      };
    }

    try {
      const res = await axios.post(hook.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'eWorkSocial-Webhooks/1.0',
          'X-EWork-Event': event,
          'X-EWork-Delivery': deliveryId,
          'X-EWork-Attempt': String(attemptNo),
          'X-EWork-Timestamp': createdAt,
          'X-EWork-Signature': `sha256=${signature}`,
        },
        timeout: 10000,
        maxRedirects: 0,
        maxContentLength: 1_000_000,
        validateStatus: () => true,
      });
      const ok = res.status >= 200 && res.status < 300;
      return {
        status: res.status,
        error: ok ? null : `Receiver answered HTTP ${res.status}`,
        durationMs: Date.now() - started,
      };
    } catch (err: any) {
      const message = String(err?.message || 'Request failed');
      this.logger.warn(`Webhook ${hook.id} delivery failed: ${message}`);
      return { status: 0, error: message.slice(0, 300), durationMs: Date.now() - started };
    }
  }

  private async touchHook(id: string, status: number) {
    await this.safe(() =>
      this.prisma.workspaceWebhook.update({ where: { id }, data: { lastStatus: status, lastFiredAt: new Date() } }),
    );
  }

  private async safe<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch {
      return undefined; // non-critical
    }
  }
}
