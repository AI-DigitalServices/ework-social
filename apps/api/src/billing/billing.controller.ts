import {
  Controller, Post, Get, Body,
  Headers, Req, UseGuards, Query,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { PlanGuardService } from '../common/plan-guard.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
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
    return this.billingService.handleWebhook(req.body, signature);
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

  // Returns current plan, limits & live usage — used by frontend gating
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
