import {
  Controller, Post, Get, Body,
  Headers, Req, UseGuards, Query,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { LemonSqueezyService } from './lemonsqueezy.service';
import { PayPalService } from './paypal.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private lemonSqueezy: LemonSqueezyService,
    private paypal: PayPalService,
    private planGuard: PlanGuardService,
  ) {}

  @Post('checkout')
  @UseGuards(JwtGuard)
  async createCheckout(@Body() dto: any, @Req() req: any) {
    return this.billingService.createCheckoutSession(
      dto.priceId,
      dto.workspaceId,
      dto.userId,
      req.user.email,
    );
  }

  /**
   * International checkout. The provider is chosen server-side from
   * INTERNATIONAL_PROVIDER so the gateway can be switched — or rolled back —
   * with an env change and a restart, no frontend deploy. Defaults to PayPal,
   * falling back to Lemon Squeezy when PayPal is not configured yet.
   */
  @Post('international/checkout')
  @UseGuards(JwtGuard)
  async createInternationalCheckout(
    @Body() dto: { tier: string; interval?: 'MONTHLY' | 'ANNUAL'; workspaceId: string },
    @Req() req: any,
  ) {
    const preferred = (process.env.INTERNATIONAL_PROVIDER || 'paypal').toLowerCase();
    const usePaypal = preferred === 'paypal' && this.paypal.isConfigured();

    if (usePaypal) {
      return this.paypal.createSubscription(
        dto.tier as any,
        dto.interval || 'MONTHLY',
        dto.workspaceId,
        req.user.email,
      );
    }
    return this.lemonSqueezy.createCheckout(dto.tier, dto.workspaceId, req.user.email);
  }

  @Post('paypal/webhook')
  async handlePaypalWebhook(@Req() req: any) {
    return this.paypal.handleWebhook(req.headers, req.rawBody as Buffer);
  }

  // Kept alongside PayPal until the cutover is proven — see INTERNATIONAL_PROVIDER.
  @Post('lemonsqueezy/checkout')
  @UseGuards(JwtGuard)
  async createLsCheckout(@Body() dto: { tier: string; workspaceId: string }, @Req() req: any) {
    return this.lemonSqueezy.createCheckout(dto.tier, dto.workspaceId, req.user.email);
  }

  @Post('lemonsqueezy/webhook')
  async handleLsWebhook(@Req() req: any, @Headers('x-signature') signature: string) {
    return this.lemonSqueezy.handleWebhook(req.rawBody as Buffer, signature);
  }

  @Post('portal')
  @UseGuards(JwtGuard)
  async createPortal(@Body() body: { workspaceId: string }) {
    return this.billingService.createPortalSession(body.workspaceId);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody = req.rawBody as Buffer;
    return this.billingService.handleWebhook(rawBody, signature);
  }

  @Get('verify')
  @UseGuards(JwtGuard)
  async verifyTransaction(
    @Query('reference') reference: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.billingService.verifyAndUpdatePlan(reference, workspaceId);
  }

  @Get('subscription')
  @UseGuards(JwtGuard)
  getSubscription(@Query('workspaceId') workspaceId: string) {
    return this.billingService.getSubscription(workspaceId);
  }

  @Get('limits')
  @UseGuards(JwtGuard)
  getLimits(@Query('workspaceId') workspaceId: string) {
    return this.planGuard.getWorkspaceLimits(workspaceId);
  }

  @Get('trial-status')
  @UseGuards(JwtGuard)
  getTrialStatus(@Query('workspaceId') workspaceId: string) {
    return this.billingService.checkAndEnforceTrialExpiry(workspaceId);
  }
}
