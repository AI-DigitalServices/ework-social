import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, EmailModule, NotificationsModule],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
