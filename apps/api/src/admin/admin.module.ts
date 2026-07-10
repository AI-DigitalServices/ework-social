import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReferralService } from './referral.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { PostHogModule } from '../analytics/posthog.module';

@Module({
  imports: [PrismaModule, AuthModule, EmailModule, PostHogModule],
  providers: [AdminService, ReferralService],
  controllers: [AdminController],
})
export class AdminModule {}
