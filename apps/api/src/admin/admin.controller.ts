import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReferralService } from './referral.service';
import { JwtGuard } from '../auth/jwt.guard';
import { AdminGuard } from '../common/admin.guard';

@Controller('admin')
@UseGuards(JwtGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private referralService: ReferralService,
  ) {}

  @Get('kpi')
  @UseGuards(AdminGuard)
  async getKpi() {
    return this.adminService.getKpiStats();
  }

  @Get('failed-posts')
  @UseGuards(AdminGuard)
  async getFailedPosts() {
    return this.adminService.getFailedPosts();
  }

  @Get('subscriptions')
  @UseGuards(AdminGuard)
  async getSubscriptions() {
    return this.adminService.getActiveSubscriptions();
  }

  @Get('health')
  @UseGuards(AdminGuard)
  async getHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('referrals')
  @UseGuards(AdminGuard)
  async getAllReferrals() {
    return this.referralService.getAllReferralStats();
  }

  @Get('waitlist')
  @UseGuards(AdminGuard)
  async getWaitlist() {
    return this.adminService.getWaitlist();
  }

  @Get('partners')
  @UseGuards(AdminGuard)
  async getPartners() {
    return this.adminService.getPartnerStats();
  }

  // ── Non-admin routes (any authenticated user) ────────────────────────────
  @Get('my-referrals')
  async getMyReferrals(@Req() req: any) {
    return this.referralService.getReferralStats(req.user.sub);
  }

  @Post('request-withdrawal')
  async requestWithdrawal(@Req() req: any, @Body() body: { amount: number; paymentDetails: string }) {
    return this.referralService.requestWithdrawal(req.user.sub, body.amount, body.paymentDetails);
  }

  @Post('generate-referral')
  async generateReferral(@Req() req: any) {
    const code = await this.referralService.generateReferralCode(req.user.sub);
    return { code, link: `https://app.eworksocial.com/register?ref=${code}` };
  }

  @Post('set-plan')
  @UseGuards(AdminGuard)
  async setPlan(@Body() body: { workspaceId: string; plan: string }) {
    return this.adminService.setWorkspacePlan(body.workspaceId, body.plan);
  }
}
