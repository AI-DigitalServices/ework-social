import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ResponderModule } from './responder/responder.module';
import { BillingModule } from './billing/billing.module';
import { SocialModule } from './social/social.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CrmModule,
    SchedulerModule,
    AnalyticsModule,
    ResponderModule,
    BillingModule,
    SocialModule,
  ],
})
export class AppModule {}
