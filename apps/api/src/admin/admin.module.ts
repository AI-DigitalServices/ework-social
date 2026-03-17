import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReferralService } from './referral.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [AdminService, ReferralService],
  controllers: [AdminController],
})
export class AdminModule {}
