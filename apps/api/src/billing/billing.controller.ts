import {
  Controller, Post, Get, Body,
  Headers, Req, UseGuards, Query,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { LemonSqueezyService } from './lemonsqueezy.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private lemonSqueezy: LemonSqueezyService,
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

  // International checkout via Lemon Squeezy (Merchant of Record).
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
