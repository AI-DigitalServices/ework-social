import { Controller, Get, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtGuard } from '../auth/jwt.guard';

const ADMIN_EMAILS = ['admin@eworksocial.com', 'eworksocial@gmail.com', 'aiservices.agent@gmail.com'];

@Controller('admin')
@UseGuards(JwtGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('kpi')
  async getKpi(@Req() req: any) {
    if (!ADMIN_EMAILS.includes(req.user.email)) {
      throw new ForbiddenException('Admin access only');
    }
    return this.adminService.getKpiStats();
  }
}
