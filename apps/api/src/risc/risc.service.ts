import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createPublicKey } from 'crypto';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

// All Google RISC security event types we handle
const RISC_EVENTS = {
  SESSIONS_REVOKED:   'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
  ACCOUNT_DISABLED:   'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
  ACCOUNT_ENABLED:    'https://schemas.openid.net/secevent/risc/event-type/account-enabled',
  CREDENTIAL_CHANGE:  'https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required',
  TOKENS_REVOKED:     'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
  TOKEN_REVOKED:      'https://schemas.openid.net/secevent/oauth/event-type/token-revoked',
  VERIFICATION:       'https://schemas.openid.net/secevent/risc/event-type/verification',
};

@Injectable()
export class RiscService {
  private readonly logger = new Logger(RiscService.name);

  // Cache Google's RISC discovery doc + public keys
  private discoveryIssuer = '';
  private cachedJwks: any[] = [];
  private jwksCachedAt = 0;
  private readonly JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Verify and process a Google RISC Security Event Token (SET).
   * Returns true if valid and processed; false if the token should be rejected (HTTP 400).
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

    // 2. Validate issuer against the value from the RISC discovery document
    //    Google may include a trailing slash — normalise before comparing
    const normalise = (s: string) => s.replace(/\/$/, '');
    const expectedIssuer = normalise(this.discoveryIssuer || 'https://accounts.google.com');
    if (normalise(payload.iss ?? '') !== expectedIssuer) {
      this.logger.warn(`RISC invalid issuer: ${payload.iss}`);
      return false;
    }

    // 3. Extract Google user ID from top-level sub OR from events subject
    const googleUserId: string | undefined =
      payload.sub ?? this.extractSubFromEvents(payload);

    // 4. Dispatch each event type
    const events: Record<string, any> = payload.events ?? {};
    const eventTypes = Object.keys(events);

    this.logger.log(
      `RISC event — jti: ${payload.jti ?? 'n/a'}, subject: ${googleUserId ?? 'none'}, types: ${eventTypes.join(', ')}`,
    );

    for (const eventType of eventTypes) {
      await this.handleEvent(eventType, googleUserId, events[eventType]);
    }

    return true;
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────────

  private async handleEvent(eventType: string, googleUserId: string | undefined, eventData: any) {
    switch (eventType) {
      case RISC_EVENTS.SESSIONS_REVOKED:
        if (googleUserId) await this.revokeYoutubeAccounts(googleUserId, 'sessions_revoked');
        break;

      case RISC_EVENTS.TOKENS_REVOKED:
      case RISC_EVENTS.TOKEN_REVOKED:
        if (googleUserId) await this.revokeYoutubeAccounts(googleUserId, 'tokens_revoked');
        break;

      case RISC_EVENTS.ACCOUNT_DISABLED: {
        const reason = eventData?.reason ?? 'unknown';
        if (googleUserId) {
          // For hijacking: terminate sessions (deactivate account)
          // For bulk-account or unknown: same — deactivate to be safe
          await this.revokeYoutubeAccounts(googleUserId, `account_disabled:${reason}`);
        }
        break;
      }

      case RISC_EVENTS.CREDENTIAL_CHANGE:
        // Suggested: flag for re-auth on next publish attempt
        if (googleUserId) await this.flagYoutubeAccountsForReauth(googleUserId);
        break;

      case RISC_EVENTS.ACCOUNT_ENABLED:
        // No action needed — user reconnects manually
        this.logger.log(`RISC account re-enabled for Google user ${googleUserId ?? 'unknown'}`);
        break;

      case RISC_EVENTS.VERIFICATION:
        // Test token — just log it as recommended in the spec
        this.logger.log(`RISC verification token received — state: ${eventData?.state ?? 'n/a'}`);
        break;

      default:
        this.logger.log(`RISC unhandled event type "${eventType}" for user ${googleUserId ?? 'n/a'}`);
    }
  }

  private async revokeYoutubeAccounts(googleUserId: string, reason: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { platform: 'YOUTUBE', accountId: googleUserId, isActive: true },
    });

    if (accounts.length === 0) {
      this.logger.log(`RISC [${reason}]: no active YouTube accounts for Google user ${googleUserId}`);
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
      where: { platform: 'YOUTUBE', accountId: googleUserId, isActive: true },
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

  // ─── JWT Verification (Node built-in crypto — no extra packages) ─────────────

  private async verifyGoogleJwt(token: string): Promise<any> {
    const keys = await this.getGooglePublicKeys();

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

    const googleClientId = this.config.get<string>('YOUTUBE_CLIENT_ID') ?? '';

    return jwt.verify(token, pem, {
      algorithms: ['RS256'],
      // Accept any of our registered client IDs in the aud claim
      audience: googleClientId || undefined,
      // Don't check expiry — security event tokens represent historical events
      ignoreExpiration: true,
    });
  }

  private async getGooglePublicKeys(): Promise<any[]> {
    const now = Date.now();
    if (this.cachedJwks.length > 0 && now - this.jwksCachedAt < this.JWKS_TTL_MS) {
      return this.cachedJwks;
    }

    // Fetch RISC discovery document → get issuer + JWKS URI
    const discoveryRes = await axios.get(
      'https://accounts.google.com/.well-known/risc-configuration',
      { timeout: 8_000 },
    );
    this.discoveryIssuer = discoveryRes.data.issuer ?? 'https://accounts.google.com';
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
      if (sub) return sub as string;
    }
    return undefined;
  }
}
