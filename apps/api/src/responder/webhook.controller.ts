import {
  Controller, Get, Post, Query,
  Body, Res, Headers, Logger,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import type { Response } from 'express';

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
    @Headers('x-hub-signature-256') signature: string,
    @Res() res: Response,
  ) {
    // Verify signature
    const appSecret = this.config.get('META_APP_SECRET');
    if (signature && appSecret) {
      const expectedSig = 'sha256=' + createHmac('sha256', appSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (signature !== expectedSig) {
        this.logger.warn('Invalid webhook signature');
        return res.status(403).send('Invalid signature');
      }
    }

    // Respond immediately — process async
    res.status(200).send('EVENT_RECEIVED');

    // Process in background
    try {
      await this.webhookService.processWebhookEvent(body);
    } catch (err) {
      this.logger.error('Webhook processing error:', err);
    }
  }
}
