import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import type { WebhookEvent } from '../webhooks/webhook-events';
import { validateWebhookUrl } from '../webhooks/webhook-url.util';
import { getPlanDisplayName, getPlanLimits } from '../common/plan-limits';
import { captureLimiter } from './api-key.util';
import { parseCaptureBody, ParsedCapture } from './capture-parse.util';
import { asObject, cleanString, cleanTags } from './public-api.validate';

const MAX_LINKS = 5;
const TOKEN_RE = /^lc_[A-Za-z0-9_-]{16,64}$/;

@Injectable()
export class LeadCaptureService {
  constructor(
    private prisma: PrismaService,
    private planGuard: PlanGuardService,
    private webhooks: WebhooksService,
  ) {}

  private emit(workspaceId: string, event: WebhookEvent, data: Record<string, any>) {
    try {
      this.webhooks.dispatch(workspaceId, event, data).catch(() => {});
    } catch {
      /* never break lead capture because of a webhook */
    }
  }

  // ---- management (owners/admins) ---------------------------------------

  async list(workspaceId: string) {
    return this.prisma.leadCaptureLink.findMany({
      where: { workspaceId },
      select: {
        id: true, name: true, token: true, enabled: true, defaultTags: true, redirectUrl: true,
        lastUsedAt: true, submissionCount: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private parseRedirect(v: unknown): string | null {
    if (v === undefined || v === null || v === '') return null;
    const check = validateWebhookUrl(v);
    if (!check.ok) throw new BadRequestException(`Thank-you page URL: ${check.reason}`);
    return check.url!.toString();
  }

  async create(workspaceId: string, rawBody: unknown) {
    const body = asObject(rawBody);
    const { plan } = await this.planGuard.assertCanWrite(workspaceId);
    if (!getPlanLimits(plan).automationEnabled) {
      throw new ForbiddenException(
        `Website lead capture is available on the Growth plan and above. Your ${getPlanDisplayName(plan)} plan doesn't include it yet.`,
      );
    }
    const name = cleanString(body.name, 'name', 60, true)!;
    const defaultTags = cleanTags(body.defaultTags) || [];
    const redirectUrl = this.parseRedirect(body.redirectUrl);

    const count = await this.prisma.leadCaptureLink.count({ where: { workspaceId } });
    if (count >= MAX_LINKS) {
      throw new BadRequestException(`You can have up to ${MAX_LINKS} lead capture links. Delete one to add another.`);
    }
    const token = `lc_${randomBytes(18).toString('base64url')}`;
    return this.prisma.leadCaptureLink.create({ data: { workspaceId, name, token, defaultTags, redirectUrl } });
  }

  private async requireLink(workspaceId: string, id: string) {
    const link = await this.prisma.leadCaptureLink.findFirst({ where: { id, workspaceId } });
    if (!link) throw new NotFoundException('Lead capture link not found.');
    return link;
  }

  async update(workspaceId: string, id: string, rawBody: unknown) {
    const body = asObject(rawBody);
    await this.requireLink(workspaceId, id);
    const data: any = {};
    if ('enabled' in body) data.enabled = !!body.enabled;
    if ('name' in body) data.name = cleanString(body.name, 'name', 60, true);
    if ('defaultTags' in body) data.defaultTags = cleanTags(body.defaultTags) || [];
    if ('redirectUrl' in body) data.redirectUrl = this.parseRedirect(body.redirectUrl);
    if (Object.keys(data).length === 0) throw new BadRequestException('Nothing to update.');
    return this.prisma.leadCaptureLink.update({ where: { id }, data });
  }

  /** New URL; the old one stops working immediately. */
  async rotate(workspaceId: string, id: string) {
    await this.requireLink(workspaceId, id);
    const token = `lc_${randomBytes(18).toString('base64url')}`;
    return this.prisma.leadCaptureLink.update({ where: { id }, data: { token } });
  }

  async remove(workspaceId: string, id: string) {
    await this.requireLink(workspaceId, id);
    await this.prisma.leadCaptureLink.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ---- public capture ---------------------------------------------------

  private buildNote(link: { name: string }, p: ParsedCapture): string | null {
    const lines: string[] = [];
    if (p.message) lines.push(p.message);
    for (const [k, v] of p.extras) lines.push(`${k}: ${v}`);
    if (lines.length === 0) return null;
    return `Website form "${link.name}":\n${lines.join('\n')}`.slice(0, 5000);
  }

  async capture(token: string, body: unknown): Promise<{ created: boolean; redirectUrl: string | null }> {
    // Unknown, malformed or disabled tokens all look the same from outside.
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) throw new NotFoundException('Not found.');
    const rl = captureLimiter.hit(`cap:${token}`, 60);
    if (!rl.ok) throw new HttpException('Too many submissions. Try again shortly.', HttpStatus.TOO_MANY_REQUESTS);

    const link = await this.prisma.leadCaptureLink.findUnique({ where: { token } });
    if (!link || !link.enabled) throw new NotFoundException('Not found.');

    const parsed = parseCaptureBody(body);
    // Bots get a normal-looking success and nothing is stored.
    if (parsed.spam) return { created: false, redirectUrl: link.redirectUrl };
    if (parsed.emailInvalid) throw new BadRequestException('A valid email address is required.');
    if (!parsed.email && !parsed.phone) throw new BadRequestException('Include an email address or phone number.');

    const workspaceId = link.workspaceId;
    const noteText = this.buildNote(link, parsed);

    const existing = parsed.email
      ? await this.prisma.client.findFirst({
          where: { workspaceId, email: { equals: parsed.email, mode: 'insensitive' } },
          select: { id: true, name: true },
        })
      : null;

    const touchLink = () =>
      this.prisma.leadCaptureLink
        .update({ where: { id: link.id }, data: { lastUsedAt: new Date(), submissionCount: { increment: 1 } } })
        .catch(() => {});

    if (existing) {
      // Same person submitting again: log it on the existing contact instead of duplicating.
      await this.planGuard.assertCanWrite(workspaceId);
      if (noteText) {
        const note = await this.prisma.note.create({ data: { clientId: existing.id, content: noteText } });
        await this.prisma.activity.create({
          data: { clientId: existing.id, type: 'NOTE_ADDED', description: `New submission from website form "${link.name}"` },
        });
        this.emit(workspaceId, 'note.added', { clientId: existing.id, clientName: existing.name, noteId: note.id, content: note.content });
      }
      await this.prisma.client.update({ where: { id: existing.id }, data: { lastContactedAt: new Date() } });
      touchLink();
      return { created: false, redirectUrl: link.redirectUrl };
    }

    await this.planGuard.checkClientLimit(workspaceId); // also refuses read-only workspaces

    const name = parsed.name || (parsed.email ? parsed.email.split('@')[0] : parsed.phone!) ;
    const tags = Array.from(new Set([...(link.defaultTags || []), 'website-form']));
    const client = await this.prisma.client.create({
      data: {
        workspaceId, name, email: parsed.email || null, phone: parsed.phone || null, company: parsed.company || null,
        tags, stage: 'LEAD' as any, source: 'WEBSITE' as any,
      },
    });

    await this.prisma.activity.create({
      data: {
        clientId: client.id,
        type: 'CREATED',
        description: `Lead captured from website form "${link.name}"`,
        metadata: { source: 'WEBSITE', form: link.name },
      },
    });
    if (noteText) await this.prisma.note.create({ data: { clientId: client.id, content: noteText } });

    this.emit(workspaceId, 'lead.created', {
      clientId: client.id, name: client.name, email: client.email, phone: client.phone, company: client.company,
      stage: client.stage, source: 'WEBSITE', form: link.name, message: parsed.message ?? null,
    });
    touchLink();
    return { created: true, redirectUrl: link.redirectUrl };
  }
}
