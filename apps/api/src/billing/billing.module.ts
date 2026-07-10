import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { PostHogModule } from '../analytics/posthog.module';

@Module({
  imports: [CommonModule, AuthModule, PostHogModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
