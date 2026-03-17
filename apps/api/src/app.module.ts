import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ResponderModule } from './responder/responder.module';
import { BillingModule } from './billing/billing.module';
import { SocialModule } from './social/social.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { AdminModule } from './admin/admin.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    CrmModule,
    ScheduleModule.forRoot(),
    SchedulerModule,
    AnalyticsModule,
    ResponderModule,
    BillingModule,
    SocialModule,
    NotificationsModule,
    OnboardingModule,
    WorkspaceModule,
    AdminModule,
  ],
})
export class AppModule {}
