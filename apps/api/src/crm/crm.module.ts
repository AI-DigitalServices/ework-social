import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { AuthModule } from '../auth/auth.module';
import { AutomationService } from './automation.service';
import { EmailService } from '../email/email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { PostHogModule } from '../analytics/posthog.module';

@Module({
  imports: [AuthModule, PrismaModule, PostHogModule, CommonModule],
  providers: [CrmService, AutomationService, EmailService],
  controllers: [CrmController],
  exports: [AutomationService],
})
export class CrmModule {}
