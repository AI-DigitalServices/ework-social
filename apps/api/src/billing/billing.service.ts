import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
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
          stripeId: data.reference,
        },
        create: {
          workspaceId,
          plan: plan as any,
          status: 'ACTIVE',
          stripeId: data.reference,
        },
      });

      return { success: true, plan };
    } catch (err) {
      console.error('Verify error:', err);
      return { success: false };
    }
  }

  async handleWebhook(payload: any, signature: string) {
    const crypto = require('crypto');
    const secret = this.config.get('PAYSTACK_SECRET_KEY');
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { event, data } = payload;
    switch (event) {
      case 'charge.success':
        await this.handlePaymentSuccess(data);
        break;
      case 'subscription.disable':
        await this.handleSubscriptionDisabled(data);
        break;
    }
    return { received: true };
  }

  private async handlePaymentSuccess(data: any) {
    const workspaceId = data.metadata?.workspaceId;
    if (!workspaceId) return;

    const planCode = data.plan?.plan_code;
    const plan = this.getPlanFromCode(planCode);

    await this.prisma.subscription.upsert({
      where: { workspaceId },
      update: { plan: plan as any, status: 'ACTIVE', stripeId: data.reference },
      create: { workspaceId, plan: plan as any, status: 'ACTIVE', stripeId: data.reference },
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

  async getSubscription(workspaceId: string) {
    return this.prisma.subscription.findFirst({ where: { workspaceId } });
  }

  async createPortalSession(workspaceId: string) {
    return { url: `${this.config.get('FRONTEND_URL')}/dashboard/settings?tab=plan` };
  }
}
