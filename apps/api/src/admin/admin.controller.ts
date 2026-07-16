import { Controller, Get, Post, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReferralService } from './referral.service';
import { JwtGuard } from '../auth/jwt.guard';

const ADMIN_EMAILS = ['admin@eworksocial.com', 'eworksocial@gmail.com', 'aiservices.agent@gmail.com', 'info.oshapify@gmail.com'];

@Controller('admin')
@UseGuards(JwtGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private referralService: ReferralService,
  ) {}

  private checkAdmin(req: any) {
    if (!ADMIN_EMAILS.includes(req.user.email)) {
      throw new ForbiddenException('Admin access only');
    }
  }

  @Get('kpi')
  async getKpi(@Req() req: any) {
    this.checkAdmin(req);
    return this.adminService.getKpiStats();
  }

  @Get('failed-posts')
  async getFailedPosts(@Req() req: any) {
    this.checkAdmin(req);
    return this.adminService.getFailedPosts();
  }

  @Get('subscriptions')
  async getSubscriptions(@Req() req: any) {
    this.checkAdmin(req);
    return this.adminService.getActiveSubscriptions();
  }

  @Get('health')
  async getHealth(@Req() req: any) {
    this.checkAdmin(req);
    return this.adminService.getSystemHealth();
  }

  @Get('referrals')
  async getAllReferrals(@Req() req: any) {
    this.checkAdmin(req);
    return this.referralService.getAllReferralStats();
  }

  @Get('waitlist')
  async getWaitlist(@Req() req: any) {
    this.checkAdmin(req);
    return this.adminService.getWaitlist();
  }

  @Get('partners')
  async getPartners(@Req() req: any) {
    this.checkAdmin(req);
    return this.adminService.getPartnerStats();
  }

  @Get('my-referrals')
  async getMyReferrals(@Req() req: any) {
    return this.referralService.getReferralStats(req.user.sub);
  }

  @Post('request-withdrawal')
  @UseGuards(JwtGuard)
  async requestWithdrawal(@Req() req: any, @Body() body: { amount: number; paymentDetails: string }) {
    return this.referralService.requestWithdrawal(req.user.sub, body.amount, body.paymentDetails);
  }

  @Post('generate-referral')
  async generateReferral(@Req() req: any) {
    const code = await this.referralService.generateReferralCode(req.user.sub);
    return { code, link: `https://app.eworksocial.com/register?ref=${code}` };
  }

  @Post('set-plan')
  async setPlan(@Req() req: any, @Body() body: { workspaceId: string; plan: string }) {
    this.checkAdmin(req);
    return this.adminService.setWorkspacePlan(body.workspaceId, body.plan);
  }
}
