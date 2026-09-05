import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SocialModule } from '../social/social.module';
import { AuthModule } from '../auth/auth.module';
import { PostHogModule } from '../analytics/posthog.module';
import { TwitterModule } from '../twitter/twitter.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [CommonModule, AuthModule, NotificationsModule, SocialModule, PostHogModule, TwitterModule, WebhooksModule],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
