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

  async createCheckoutSession(
    planCode: string,
    workspaceId: string,
    userId: string,
    userEmail: string,
  ) {
    const response = await axios.post(
      `${this.paystackBase}/transaction/initialize`,
      {
        email: userEmail,
        plan: planCode,
        callback_url: `${this.config.get('FRONTEND_URL')}/dashboard/settings?tab=plan&success=true`,
        metadata: {
          workspaceId,
          userId,
          cancel_action: `${this.config.get('FRONTEND_URL')}/dashboard/settings?tab=plan`,
        },
      },
      { headers: this.headers },
    );

    return { url: response.data.data.authorization_url };
  }

  async verifyTransaction(reference: string) {
    const response = await axios.get(
      `${this.paystackBase}/transaction/verify/${reference}`,
      { headers: this.headers },
    );
    return response.data.data;
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
      case 'subscription.create':
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
      update: {
        plan: plan as any,
        status: 'ACTIVE',
        stripeId: data.subscription_code || data.reference,
      },
      create: {
        workspaceId,
        plan: plan as any,
        status: 'ACTIVE',
        stripeId: data.subscription_code || data.reference,
      },
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

  private getPlanFromCode(planCode: string): string {
    const map: Record<string, string> = {
      [this.config.get('PAYSTACK_STARTER_PLAN')!]: 'STARTER',
      [this.config.get('PAYSTACK_GROWTH_PLAN')!]: 'GROWTH',
      [this.config.get('PAYSTACK_AGENCY_PRO_PLAN')!]: 'AGENCY_PRO',
    };
    return map[planCode] || 'FREE';
  }

  async getSubscription(workspaceId: string) {
    return this.prisma.subscription.findFirst({
      where: { workspaceId },
    });
  }

  async createPortalSession(workspaceId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { workspaceId },
    });
    return {
      url: `${this.config.get('FRONTEND_URL')}/dashboard/settings?tab=plan`,
      message: 'Contact support to manage subscription',
    };
  }
}
