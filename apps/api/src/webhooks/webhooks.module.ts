import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';

// Outbound webhooks — exported so other modules (Scheduler, CRM, Responder)
// can inject WebhooksService and call dispatch() on their events.
@Module({
  imports: [PrismaModule, CommonModule, AuthModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
