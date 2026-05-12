import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createPublicKey } from 'crypto';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

// Google RISC security event types
const RISC_EVENTS = {
  SESSIONS_REVOKED:   'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
  ACCOUNT_DISABLED:   'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
  ACCOUNT_ENABLED:    'https://schemas.openid.net/secevent/risc/event-type/account-enabled',
  CREDENTIAL_CHANGE:  'https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required',
  TOKENS_REVOKED:     'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
};

@Injectable()
export class RiscService {
  private readonly logger = new Logger(RiscService.name);

  // Cache Google's public keys to avoid fetching on every request
  private cachedJwks: any[] = [];
  private jwksCachedAt = 0;
  private readonly JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Verify and process a Google RISC Security Event Token (SET).
   * Returns true if valid and processed; false if the token should be rejected.
   */
  async processSecurityEvent(rawToken: string): Promise<boolean> {
    // 1. Verify JWT signature using Google's public keys
    let payload: any;
    try {
      payload = await this.verifyGoogleJwt(rawToken);
    } catch (err) {
      this.logger.warn(`RISC JWT verification failed: ${(err as Error).message}`);
      return false;
    }

    // 2. Validate issuer
    if (payload.iss !== 'https://accounts.google.com') {
      this.logger.warn(`RISC invalid issuer: ${payload.iss}`);
      return false;
    }

    // 3. Extract Google user ID from subject or events
    const googleUserId: string | undefined =
      payload.sub ?? this.extractSubFromEvents(payload);

    if (!googleUserId) {
      this.logger.log('RISC event has no identifiable subject — accepted, no action');
      return true;
    }

    // 4. Determine event types and handle each
    const events: Record<string, any> = payload.events ?? {};
    const eventTypes = Object.keys(events);
    this.logger.log(
      `RISC event — subject: ${googleUserId}, types: ${eventTypes.join(', ')}`,
    );

    for (const eventType of eventTypes) {
      await this.handleEvent(eventType, googleUserId);
    }

    return true;
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────────

  private async handleEvent(eventType: string, googleUserId: string) {
    switch (eventType) {
      case RISC_EVENTS.SESSIONS_REVOKED:
      case RISC_EVENTS.TOKENS_REVOKED:
        await this.revokeYoutubeAccounts(googleUserId, 'tokens_revoked');
        break;

      case RISC_EVENTS.ACCOUNT_DISABLED:
        await this.revokeYoutubeAccounts(googleUserId, 'account_disabled');
        break;

      case RISC_EVENTS.CREDENTIAL_CHANGE:
        // Clear refresh tokens so the next publish attempt forces re-auth
        await this.flagYoutubeAccountsForReauth(googleUserId);
        break;

      case RISC_EVENTS.ACCOUNT_ENABLED:
        // No action — user can reconnect their account manually
        this.logger.log(`RISC account re-enabled for Google user ${googleUserId}`);
        break;

      default:
        this.logger.log(`RISC unhandled event "${eventType}" for user ${googleUserId}`);
    }
  }

  private async revokeYoutubeAccounts(googleUserId: string, reason: string) {
    // Match YouTube accounts by the Google user ID stored at connect time.
    // We store the Google channel ID as accountId; if the RISC sub matches
    // any YouTube account in any workspace, we deactivate it.
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        platform: 'YOUTUBE',
        accountId: googleUserId,
        isActive: true,
      },
    });

    if (accounts.length === 0) {
      this.logger.log(
        `RISC [${reason}]: no active YouTube accounts found for Google user ${googleUserId}`,
      );
      return;
    }

    await this.prisma.socialAccount.updateMany({
      where: { id: { in: accounts.map((a) => a.id) } },
      data: { isActive: false, accessToken: '', refreshToken: '' },
    });

    this.logger.warn(
      `RISC [${reason}]: deactivated ${accounts.length} YouTube account(s) for Google user ${googleUserId}`,
    );
  }

  private async flagYoutubeAccountsForReauth(googleUserId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        platform: 'YOUTUBE',
        accountId: googleUserId,
        isActive: true,
      },
    });

    if (accounts.length === 0) return;

    await this.prisma.socialAccount.updateMany({
      where: { id: { in: accounts.map((a) => a.id) } },
      data: { refreshToken: '' },
    });

    this.logger.warn(
      `RISC [credential_change]: cleared refresh tokens for ${accounts.length} YouTube account(s), Google user ${googleUserId}`,
    );
  }

  // ─── JWT Verification (no extra packages — uses Node built-in crypto) ────────

  private async verifyGoogleJwt(token: string): Promise<any> {
    const keys = await this.getGooglePublicKeys();

    // Decode header to find the matching key ID
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Failed to decode JWT');
    }

    const kid = (decoded.header as any).kid as string | undefined;
    const jwk = kid ? keys.find((k: any) => k.kid === kid) : keys[0];
    if (!jwk) {
      throw new Error(`No Google public key found for kid: ${kid}`);
    }

    // Node 16+ can import JWK natively — no extra package required
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    const pem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

    return jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: 'https://accounts.google.com',
    });
  }

  private async getGooglePublicKeys(): Promise<any[]> {
    const now = Date.now();
    if (this.cachedJwks.length > 0 && now - this.jwksCachedAt < this.JWKS_TTL_MS) {
      return this.cachedJwks;
    }

    // Fetch Google's RISC discovery document → get JWKS URI
    const discoveryRes = await axios.get(
      'https://accounts.google.com/.well-known/risc-configuration',
      { timeout: 8_000 },
    );
    const jwksUri: string = discoveryRes.data.jwks_uri;

    const jwksRes = await axios.get(jwksUri, { timeout: 8_000 });
    this.cachedJwks = jwksRes.data.keys;
    this.jwksCachedAt = now;
    return this.cachedJwks;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private extractSubFromEvents(payload: any): string | undefined {
    const events = payload.events ?? {};
    for (const eventData of Object.values(events)) {
      const sub = (eventData as any)?.subject?.sub;
      if (sub) return sub;
    }
    return undefined;
  }
}
