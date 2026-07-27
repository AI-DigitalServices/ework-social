import {
  Controller, Get, Post, Query,
  Body, Res, Headers, Logger, Req,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Response, Request } from 'express';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private webhookService: WebhookService,
    private config: ConfigService,
  ) {}

  // Meta webhook verification handshake
  @Get('facebook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get('META_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Facebook webhook verified successfully');
      return res.status(200).send(challenge);
    }

    this.logger.warn('Facebook webhook verification failed');
    return res.status(403).send('Forbidden');
  }

  // Receive Facebook/Instagram events
  @Post('facebook')
  async handleFacebookWebhook(
    @Body() body: any,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-hub-signature-256') signature: string,
    @Res() res: Response,
  ) {
    // Confirm delivery + structure without logging any message content (PII-safe):
    // object tells us page vs instagram; entryCount tells us events are present.
    this.logger.log(
      `Webhook POST received — object:${body?.object ?? 'unknown'} entries:${Array.isArray(body?.entry) ? body.entry.length : 0}`,
    );

    // Signature verification. Meta signs the raw body with an app secret and
    // sends it as x-hub-signature-256. We verify against both the Facebook and
    // Instagram app secrets (they can differ).
    //
    // Enforcement is gated behind WEBHOOK_ENFORCE_SIGNATURE. It defaults OFF so
    // a verification/config issue can never silently drop real events (Engagement
    // Hub depends on this). When a mismatch happens we log rich, non-sensitive
    // diagnostics so the secret/rawBody problem can be pinpointed, THEN the flag
    // can be turned on to hard-block. This restores the pre-hardening behaviour
    // while keeping a clear path to strict verification.
    const hasRaw = !!(req as any).rawBody;
    const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(body));
    const secrets = [
      this.config.get('META_APP_SECRET'),
      this.config.get('INSTAGRAM_APP_SECRET'),
    ].filter(Boolean) as string[];

    const valid = !!signature && secrets.some((secret) => {
      const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    });

    const enforce = this.config.get('WEBHOOK_ENFORCE_SIGNATURE') === 'true';

    if (!valid) {
      // Diagnostics only — no secrets, no message content. `rawBodyCaptured:false`
      // means NestJS didn't buffer the raw body (verification can't work); if it's
      // true and this still fails, the configured app secret is wrong.
      this.logger.warn(
        `Webhook signature mismatch — rawBodyCaptured:${hasRaw} rawBodyLen:${rawBody.length} ` +
        `sigHeaderPresent:${!!signature} secretsConfigured:${secrets.length} enforce:${enforce}`,
      );
      if (enforce) return res.status(401).send('invalid signature');
      // Not enforcing → fall through and process, so legitimate events aren't lost.
    }

    // Respond immediately — process async (never log the raw payload body: it can
    // contain private message content / PII)
    res.status(200).send('EVENT_RECEIVED');

    // Process in background
    try {
      await this.webhookService.processWebhookEvent(body);
    } catch (err) {
      this.logger.error('Webhook processing error:', err);
    }
  }
}
