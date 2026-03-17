import { Controller, Get, Post, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReferralService } from './referral.service';
import { JwtGuard } from '../auth/jwt.guard';

const ADMIN_EMAILS = ['admin@eworksocial.com', 'eworksocial@gmail.com', 'aiservices.agent@gmail.com'];

@Controller('admin')
@UseGuards(JwtGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private referralService: ReferralService,
  ) {}

  @Get('kpi')
  async getKpi(@Req() req: any) {
    if (!ADMIN_EMAILS.includes(req.user.email)) throw new ForbiddenException('Admin access only');
    return this.adminService.getKpiStats();
  }

  @Get('referrals')
  async getAllReferrals(@Req() req: any) {
    if (!ADMIN_EMAILS.includes(req.user.email)) throw new ForbiddenException('Admin access only');
    return this.referralService.getAllReferralStats();
  }

  @Get('my-referrals')
  async getMyReferrals(@Req() req: any) {
    return this.referralService.getReferralStats(req.user.sub);
  }

  @Post('generate-referral')
  async generateReferral(@Req() req: any) {
    const code = await this.referralService.generateReferralCode(req.user.sub);
    return { code, link: `https://app.eworksocial.com/register?ref=${code}` };
  }
}
