import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

type Tier = 'STARTER' | 'GROWTH' | 'AGENCY_PRO';
type Interval = 'MONTHLY' | 'ANNUAL';

/**
 * PayPal Subscriptions billing for international customers — replaces Lemon
 * Squeezy in that slot, alongside Paystack (which serves African customers).
 * Config from env, mirroring the Paystack and Lemon Squeezy setup:
 *   PAYPAL_ENV ('sandbox' | 'live'), PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET,
 *   PAYPAL_WEBHOOK_ID,
 *   PAYPAL_PLAN_{STARTER|GROWTH|AGENCY_PRO}_{MONTHLY|ANNUAL}
 * Dormant until client id + secret are set, so it never disrupts anything else.
 *
 * Note: plans carry NO trial cycle. The 7 free days live inside eWork Social,
 * before the user ever reaches PayPal — that is what lets us advertise a
 * genuinely card-free trial. A PayPal TRIAL cycle would still show an approval
 * screen up front and make that claim false.
 */
@Injectable()
export class PayPalService {
  private readonly logger = new Logger(PayPalService.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  isConfigured(): boolean {
    return (
      !!this.config.get<string>('PAYPAL_CLIENT_ID') &&
      !!this.config.get<string>('PAYPAL_CLIENT_SECRET')
    );
  }

  private get base(): string {
    return this.config.get<string>('PAYPAL_ENV') === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.token;
    }

    const id = this.config.get<string>('PAYPAL_CLIENT_ID');
    const secret = this.config.get<string>('PAYPAL_CLIENT_SECRET');
    if (!id || !secret) {
      throw new BadRequestException('International checkout is not configured.');
    }

    const creds = Buffer.from(`${id}:${secret}`).toString('base64');
    const res = await axios.post(
      `${this.base}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const token = res.data?.access_token;
    const expiresIn = Number(res.data?.expires_in || 0);
    if (!token) throw new Error('PayPal returned no access token');

    this.tokenCache = { token, expiresAt: now + expiresIn * 1000 };
    return token;
  }

  // ── Plan mapping ────────────────────────────────────────────────────────

  private planToPlanId(tier: Tier, interval: Interval): string | null {
    return this.config.get<string>(`PAYPAL_PLAN_${tier}_${interval}`) || null;
  }

  /** PayPal plan id → our tier. Used by the webhook to know what was bought. */
  private planIdToTier(planId: string): Tier | null {
    const tiers: Tier[] = ['STARTER', 'GROWTH', 'AGENCY_PRO'];
    const intervals: Interval[] = ['MONTHLY', 'ANNUAL'];
    for (const tier of tiers) {
      for (const interval of intervals) {
        if (this.planToPlanId(tier, interval) === planId) return tier;
      }
    }
    return null;
  }

  // ── Checkout ────────────────────────────────────────────────────────────

  /**
   * Creates a PayPal subscription in APPROVAL_PENDING state and returns the
   * approval URL to redirect the user to. Nothing is charged until they
   * approve; the BILLING.SUBSCRIPTION.ACTIVATED webhook is what actually
   * upgrades the workspace.
   *
   * workspaceId rides along as custom_id so the webhook can tie the
   * subscription back to the workspace — the same trick the Lemon Squeezy
   * integration uses with custom_data.
   */
  async createSubscription(
    tier: Tier,
    interval: Interval,
    workspaceId: string,
    userEmail: string,
  ): Promise<{ url: string }> {
    const planId = this.planToPlanId(tier, interval);
    if (!planId) {
      throw new BadRequestException('This plan is not available for international checkout.');
    }

    const frontend = this.config.get<string>('FRONTEND_URL');

    try {
      const token = await this.getAccessToken();
      const res = await axios.post(
        `${this.base}/v1/billing/subscriptions`,
        {
          plan_id: planId,
          custom_id: workspaceId,
          subscriber: { email_address: userEmail },
          application_context: {
            brand_name: 'eWork Social',
            user_action: 'SUBSCRIBE_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${frontend}/dashboard/settings?tab=plan&success=true&provider=paypal`,
            cancel_url: `${frontend}/dashboard/settings?tab=plan&cancelled=true`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        },
      );

      const links: Array<{ rel: string; href: string }> = res.data?.links || [];
      const approve = links.find((l) => l.rel === 'approve')?.href;
      if (!approve) throw new Error('no approval link returned');

      this.logger.log(
        `PayPal subscription ${res.data?.id} created for workspace ${workspaceId} (${tier}/${interval})`,
      );
      return { url: approve };
    } catch (err: any) {
      this.logger.error(
        `PayPal checkout failed: ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`,
      );
      throw new BadRequestException('Could not start checkout. Please try again.');
    }
  }

  // ── Webhook ─────────────────────────────────────────────────────────────

  /**
   * Unlike Paystack and Lemon Squeezy there is no local HMAC to compute —
   * PayPal verifies the signature server-side from the transmission headers.
   * Never process an event that does not come back SUCCESS.
   */
  private async verifySignature(headers: Record<string, any>, event: any): Promise<boolean> {
    const webhookId = this.config.get<string>('PAYPAL_WEBHOOK_ID');
    if (!webhookId) {
      this.logger.error('PAYPAL_WEBHOOK_ID is not set — refusing to process webhook.');
      return false;
    }

    const h = (name: string) => headers[name] || headers[name.toLowerCase()];

    try {
      const token = await this.getAccessToken();
      const res = await axios.post(
        `${this.base}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: h('paypal-auth-algo'),
          cert_url: h('paypal-cert-url'),
          transmission_id: h('paypal-transmission-id'),
          transmission_sig: h('paypal-transmission-sig'),
          transmission_time: h('paypal-transmission-time'),
          webhook_id: webhookId,
          webhook_event: event,
        },
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        },
      );
      return res.data?.verification_status === 'SUCCESS';
    } catch (err: any) {
      this.logger.error(
        `PayPal signature verification failed: ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`,
      );
      return false;
    }
  }

  /**
   * PayPal retries on any non-2xx, and does not guarantee exactly-once
   * delivery, so every branch here is idempotent — an event replayed twice
   * lands the workspace in the same state.
   */
  async handleWebhook(headers: Record<string, any>, rawBody: Buffer) {
    const event = JSON.parse(rawBody.toString('utf8'));

    if (!(await this.verifySignature(headers, event))) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventType: string = event?.event_type;
    const resource = event?.resource || {};
    const subId: string = String(resource?.id || resource?.billing_agreement_id || '');

    // custom_id rides on the subscription. Renewal (sale) events may not carry
    // it, so fall back to looking the workspace up by the stored subscription id.
    let workspaceId: string | undefined = resource?.custom_id;
    if (!workspaceId && subId) {
      const existing = await this.prisma.subscription.findFirst({
        where: { paypalSubscriptionId: subId } as any,
        select: { workspaceId: true },
      });
      workspaceId = existing?.workspaceId;
    }

    if (!workspaceId) {
      this.logger.warn(`PayPal webhook ${eventType} had no workspace reference — skipping.`);
      return { received: true };
    }

    const setPlan = async (plan: Tier, status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE') => {
      await this.prisma.subscription.upsert({
        where: { workspaceId },
        update: {
          plan: plan as any,
          status: status as any,
          paypalSubscriptionId: subId || undefined,
          provider: 'paypal',
        } as any,
        create: {
          workspaceId: workspaceId!,
          plan: plan as any,
          status: status as any,
          paypalSubscriptionId: subId || undefined,
          provider: 'paypal',
        } as any,
      });
    };

    const setStatus = async (status: 'CANCELLED' | 'PAST_DUE') => {
      await this.prisma.subscription.updateMany({
        where: { workspaceId },
        data: { status: status as any },
      });
    };

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED': {
        const tier = this.planIdToTier(String(resource?.plan_id || ''));
        if (tier) {
          await setPlan(tier, 'ACTIVE');
        } else {
          this.logger.warn(`PayPal plan_id ${resource?.plan_id} does not map to a tier — check env.`);
        }
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        // A renewal came through. Clear any PAST_DUE without touching the tier.
        await this.prisma.subscription.updateMany({
          where: { workspaceId, status: 'PAST_DUE' as any },
          data: { status: 'ACTIVE' as any },
        });
        break;
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await setStatus('PAST_DUE');
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await setStatus('CANCELLED');
        break;

      default:
        this.logger.debug(`Unhandled PayPal event: ${eventType}`);
    }

    return { received: true };
  }
}
