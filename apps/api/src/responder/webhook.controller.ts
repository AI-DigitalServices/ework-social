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
    // Signature verification — BLOCK on mismatch. The x-hub-signature-256 is the
    // only proof the payload genuinely came from Meta; an unverified event could
    // be forged. Facebook and Instagram may sign with different app secrets, so
    // accept the request if it validates against either.
    const rawBody = (req as any).rawBody ?? Buffer.from(JSON.stringify(body));
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

    if (!valid) {
      this.logger.warn('Webhook signature verification failed — rejecting');
      return res.status(401).send('invalid signature');
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
