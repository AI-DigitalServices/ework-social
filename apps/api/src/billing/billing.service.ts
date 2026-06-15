import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class BillingService {
  private paystackBase = 'https://api.paystack.co';

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    };
  }

  private getPlanAmount(planCode: string): number {
    const amounts: Record<string, number> = {
      [this.config.get('PAYSTACK_STARTER_PLAN')!]: 500000,
      [this.config.get('PAYSTACK_GROWTH_PLAN')!]: 1200000,
      [this.config.get('PAYSTACK_AGENCY_PRO_PLAN')!]: 2900000,
    };
    return amounts[planCode] || 500000;
  }

  private getPlanFromCode(planCode: string): string {
    const map: Record<string, string> = {
      [this.config.get('PAYSTACK_STARTER_PLAN')!]: 'STARTER',
      [this.config.get('PAYSTACK_GROWTH_PLAN')!]: 'GROWTH',
      [this.config.get('PAYSTACK_AGENCY_PRO_PLAN')!]: 'AGENCY_PRO',
      [this.config.get('PAYSTACK_FOUNDING_PLAN')!]: 'AGENCY_PRO',
    };
    return map[planCode] || 'STARTER';
  }

  async createCheckoutSession(
    planCode: string,
    workspaceId: string,
    userId: string,
    userEmail: string,
  ) {
    try {
      const amount = this.getPlanAmount(planCode);
      const response = await axios.post(
        `${this.paystackBase}/transaction/initialize`,
        {
          email: userEmail,
          amount,
          plan: planCode,
          currency: 'NGN',
          callback_url: `${this.config.get('FRONTEND_URL')}/dashboard/settings?tab=plan&success=true`,
          metadata: { workspaceId, userId },
        },
        { headers: this.headers },
      );
      return { url: response.data.data.authorization_url };
    } catch (err: any) {
      const message = err.response?.data?.message || 'Paystack error';
      throw new BadRequestException(message);
    }
  }

  async verifyAndUpdatePlan(reference: string, workspaceId: string) {
    try {
      const response = await axios.get(
        `${this.paystackBase}/transaction/verify/${reference}`,
        { headers: this.headers },
      );

      const data = response.data.data;
      if (data.status !== 'success') return { success: false };

      const planCode = data.plan?.plan_code;
      const plan = planCode ? this.getPlanFromCode(planCode) : 'STARTER';

      await this.prisma.subscription.upsert({
        where: { workspaceId },
        update: {
          plan: plan as any,
          status: 'ACTIVE',
          paystackRef: data.reference,
        },
        create: {
          workspaceId,
          plan: plan as any,
          status: 'ACTIVE',
          paystackRef: data.reference,
        },
      });

      return { success: true, plan };
    } catch (err) {
      console.error('Verify error:', err);
      return { success: false };
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY')!;

    // Use the raw Buffer directly — never JSON.stringify
    const hash = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Parse the body after verification
    const payload = JSON.parse(rawBody.toString('utf8'));
    const { event, data } = payload;

    switch (event) {
      case 'charge.success':
        await this.handlePaymentSuccess(data);
        break;
      case 'subscription.disable':
        await this.handleSubscriptionDisabled(data);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(data);
        break;
    }
    return { received: true };
  }

  private async handlePaymentSuccess(data: any) {
    let workspaceId = data.metadata?.workspaceId;
    const planCode = data.plan?.plan_code;
    const plan = this.getPlanFromCode(planCode);

    // Fallback for standalone Payment Page checkouts (no metadata.workspaceId)
    // Match the paying customer's email to their workspace
    if (!workspaceId) {
      const email = data.customer?.email;
      if (!email) {
        console.warn(`Webhook charge.success had no workspaceId and no customer email: ${data.reference}`);
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { email },
        include: { ownedWorkspaces: true },
      });

      if (!user || !user.ownedWorkspaces?.[0]) {
        console.warn(`Webhook charge.success: no matching user/workspace for email ${email}`);
        return;
      }

      workspaceId = user.ownedWorkspaces[0].id;
      console.log(`Founding member payment matched by email ${email} -> workspace ${workspaceId}`);
    }

    await this.prisma.subscription.upsert({
      where: { workspaceId },
      update: { plan: plan as any, status: 'ACTIVE', paystackRef: data.reference },
      create: { workspaceId, plan: plan as any, status: 'ACTIVE', paystackRef: data.reference },
    });
  }

  private async handleSubscriptionDisabled(data: any) {
    const workspaceId = data.metadata?.workspaceId;
    if (!workspaceId) return;
    await this.prisma.subscription.updateMany({
      where: { workspaceId },
      data: { plan: 'FREE' as any, status: 'CANCELLED' },
    });
  }

  private async handlePaymentFailed(data: any) {
    const workspaceId = data.metadata?.workspaceId;
    if (!workspaceId) return;
    await this.prisma.subscription.updateMany({
      where: { workspaceId },
      data: { status: 'PAST_DUE' as any },
    });
  }

  async getSubscription(workspaceId: string) {
    return this.prisma.subscription.findFirst({ where: { workspaceId } });
  }

  async getTrialStatus(workspaceId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { workspaceId } });
    if (!sub) return { plan: 'FREE', trialActive: false, trialDaysLeft: 0, expired: true };

    const now = new Date();
    const trialEndsAt = sub.trialEndsAt;

    // Any paid plan (regardless of status) is always treated as active —
    // prevents a cancelled/expired trial from overriding a manual upgrade
    const isPaidPlan = sub.plan !== 'FREE';
    const isActive   = sub.status === 'ACTIVE' && isPaidPlan;

    if (isActive)   return { plan: sub.plan, trialActive: false, trialDaysLeft: 0, expired: false };

    // If plan was manually set to a paid tier but status wasn't updated, honour it
    if (isPaidPlan) return { plan: sub.plan, trialActive: false, trialDaysLeft: 0, expired: false };

    if (trialEndsAt) {
      const msLeft  = trialEndsAt.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        return { plan: 'FREE', trialActive: true, trialDaysLeft: daysLeft, expired: false };
      } else {
        // Only reset to FREE/CANCELLED if they are genuinely on the FREE plan
        if (sub.plan === 'FREE') {
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'CANCELLED' },
          });
        }
        return { plan: sub.plan === 'FREE' ? 'FREE' : sub.plan, trialActive: false, trialDaysLeft: 0, expired: sub.plan === 'FREE' };
      }
    }
    return { plan: 'FREE', trialActive: false, trialDaysLeft: 0, expired: true };
  }

  async checkAndEnforceTrialExpiry(workspaceId: string) {
    const status = await this.getTrialStatus(workspaceId);
    if (status.expired) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true },
      });
      if (workspace) {
        const existing = await this.prisma.notification.findFirst({
          where: { userId: workspace.ownerId, type: 'trial_expired' },
        });
        if (!existing) {
          await this.prisma.notification.create({
            data: {
              userId: workspace.ownerId,
              type: 'trial_expired',
              title: '⏰ Your free trial has ended',
              message: 'Upgrade to a paid plan to continue using eWork Social.',
              link: '/dashboard/settings?tab=plan',
            },
          });
        }
      }
    }
    return status;
  }

  async createPortalSession(workspaceId: string) {
    return { url: `${this.config.get('FRONTEND_URL')}/dashboard/settings?tab=plan` };
  }
}
