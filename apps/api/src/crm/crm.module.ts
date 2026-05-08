import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { AuthModule } from '../auth/auth.module';
import { AutomationService } from './automation.service';
import { EmailService } from '../email/email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanGuard } from '../common/plan.guard';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [CrmService, AutomationService, EmailService, PlanGuard],
  controllers: [CrmController],
  exports: [AutomationService],
})
export class CrmModule {}
