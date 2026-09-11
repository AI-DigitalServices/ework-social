import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

const LS_BASE = 'https://api.lemonsqueezy.com/v1';

/**
 * Lemon Squeezy (Merchant of Record) billing for international customers —
 * runs alongside Paystack (which serves African customers). All config comes
 * from env, mirroring the Paystack setup:
 *   LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET,
 *   LEMONSQUEEZY_STARTER_VARIANT, LEMONSQUEEZY_GROWTH_VARIANT, LEMONSQUEEZY_AGENCY_PRO_VARIANT
 * Dormant until the API key + variant IDs are set, so it never disrupts Paystack.
 */
@Injectable()
export class LemonSqueezyService {
  private readonly logger = new Logger(LemonSqueezyService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('LEMONSQUEEZY_API_KEY');
  }

  /** Variant id → plan tier (from env). */
  private variantToPlan(variantId: string): 'STARTER' | 'GROWTH' | 'AGENCY_PRO' | null {
    const map: Record<string, 'STARTER' | 'GROWTH' | 'AGENCY_PRO'> = {
      [this.config.get<string>('LEMONSQUEEZY_STARTER_VARIANT') || '']: 'STARTER',
      [this.config.get<string>('LEMONSQUEEZY_GROWTH_VARIANT') || '']: 'GROWTH',
      [this.config.get<string>('LEMONSQUEEZY_AGENCY_PRO_VARIANT') || '']: 'AGENCY_PRO',
    };
    return map[String(variantId)] || null;
  }

  /** Plan tier → variant id (from env). */
  private planToVariant(tier: string): string | null {
    if (tier === 'STARTER') return this.config.get<string>('LEMONSQUEEZY_STARTER_VARIANT') || null;
    if (tier === 'GROWTH') return this.config.get<string>('LEMONSQUEEZY_GROWTH_VARIANT') || null;
    if (tier === 'AGENCY_PRO') return this.config.get<string>('LEMONSQUEEZY_AGENCY_PRO_VARIANT') || null;
    return null;
  }

  /**
   * Create a hosted checkout for a tier and return its URL. workspaceId is
   * passed as custom data so the webhook can tie the subscription back to it.
   */
  async createCheckout(tier: string, workspaceId: string, userEmail: string): Promise<{ url: string }> {
    const apiKey = this.config.get<string>('LEMONSQUEEZY_API_KEY');
    const storeId = this.config.get<string>('LEMONSQUEEZY_STORE_ID');
    const variantId = this.planToVariant(tier);
    if (!apiKey || !storeId || !variantId) {
      throw new BadRequestException('International checkout is not configured for this plan.');
    }

    try {
      const res = await axios.post(
        `${LS_BASE}/checkouts`,
        {
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                email: userEmail,
                custom: { workspace_id: workspaceId },
              },
              product_options: {
                redirect_url: `${this.config.get('FRONTEND_URL')}/dashboard/settings?tab=plan&success=true`,
              },
            },
            relationships: {
              store: { data: { type: 'stores', id: String(storeId) } },
              variant: { data: { type: 'variants', id: String(variantId) } },
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/vnd.api+json',
            Accept: 'application/vnd.api+json',
          },
        },
      );
      const url = res.data?.data?.attributes?.url;
      if (!url) throw new Error('no checkout url returned');
      return { url };
    } catch (err: any) {
      this.logger.error(`LS checkout failed: ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      throw new BadRequestException('Could not start checkout. Please try again.');
    }
  }

  /** Verify the X-Signature header (HMAC-SHA256 hex of the raw body). */
  private verifySignature(rawBody: Buffer, signature: string): boolean {
    const secret = this.config.get<string>('LEMONSQUEEZY_WEBHOOK_SECRET');
    if (!secret || !signature) return false;
    const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.verifySignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventName: string = payload?.meta?.event_name;
    const workspaceId: string | undefined = payload?.meta?.custom_data?.workspace_id;
    const attrs = payload?.data?.attributes || {};
    const subId = String(payload?.data?.id || '');
    const variantId = attrs?.variant_id;

    if (!workspaceId) {
      this.logger.warn(`LS webhook ${eventName} had no workspace_id custom data — skipping.`);
      return { received: true };
    }

    const setPlan = async (plan: string, status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE') => {
      await this.prisma.subscription.upsert({
        where: { workspaceId },
        update: { plan: plan as any, status: status as any, lemonSqueezySubId: subId, provider: 'lemonsqueezy' },
        create: { workspaceId, plan: plan as any, status: status as any, lemonSqueezySubId: subId, provider: 'lemonsqueezy' },
      });
    };

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
      case 'subscription_unpaused':
      case 'subscription_plan_changed':
      case 'subscription_payment_success': {
        const plan = this.variantToPlan(variantId);
        if (plan) await setPlan(plan, 'ACTIVE');
        break;
      }
      case 'subscription_payment_failed':
        await this.prisma.subscription.updateMany({ where: { workspaceId }, data: { status: 'PAST_DUE' as any } });
        break;
      case 'subscription_cancelled':
      case 'subscription_expired':
      case 'subscription_paused':
        await this.prisma.subscription.updateMany({ where: { workspaceId }, data: { status: 'CANCELLED' as any } });
        break;
      default:
        this.logger.debug(`Unhandled LS event: ${eventName}`);
    }

    return { received: true };
  }
}
