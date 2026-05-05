import { Module } from '@nestjs/common';
import { ResponderController } from './responder.controller';
import { ResponderService } from './responder.service';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ResponderController, WebhookController],
  providers: [ResponderService, WebhookService],
  exports: [ResponderService, WebhookService],
})
export class ResponderModule {}
