import {
  Controller,
  Post,
  Req,
  Res,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { RiscService } from './risc.service';
import type { Request, Response } from 'express';

/**
 * Google Cross-Account Protection (RISC) receiver.
 *
 * Google calls POST /api/risc/google with a signed JWT (Security Event Token)
 * whenever a security event occurs on a connected Google account (e.g. account
 * compromised, sessions revoked, password changed).
 *
 * Registration: Google Cloud Console → APIs & Services → Credentials →
 *   Security → Cross-Account Protection → Add Receiver URL
 *
 * Docs: https://developers.google.com/identity/protocols/risc
 */
@Controller('risc')
export class RiscController {
  private readonly logger = new Logger(RiscController.name);

  constructor(private riscService: RiscService) {}

  @Post('google')
  @HttpCode(202)
  async handleGoogleRisc(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Google sends the SET as the raw request body (application/secevent+jwt)
    // or as JSON { token: '...' }. Support both.
    const contentType = req.headers['content-type'] ?? '';

    let rawToken: string | undefined;

    if (contentType.includes('secevent+jwt') || contentType.includes('application/jwt')) {
      // Raw JWT body
      rawToken = (req as any).rawBody?.toString() ?? (req.body as string);
    } else if (typeof req.body === 'string') {
      rawToken = req.body;
    } else if (req.body?.token) {
      rawToken = req.body.token;
    } else {
      // Try rawBody fallback
      rawToken = (req as any).rawBody?.toString();
    }

    if (!rawToken) {
      this.logger.warn('RISC request received with no token body');
      res.status(400).json({ error: 'Missing security event token' });
      return;
    }

    this.logger.log(`RISC event received (${rawToken.substring(0, 60)}...)`);

    const valid = await this.riscService.processSecurityEvent(rawToken.trim());

    if (valid) {
      res.status(202).send();
    } else {
      // Return 400 so Google knows the token was rejected
      res.status(400).json({ error: 'Invalid security event token' });
    }
  }
}
