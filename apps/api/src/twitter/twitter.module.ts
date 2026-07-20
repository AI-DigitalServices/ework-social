import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TwitterPollerService } from './twitter-poller.service';
import { TwitterController } from './twitter.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, CommonModule],
  controllers: [TwitterController],
  providers: [TwitterPollerService],
  exports: [TwitterPollerService],
})
export class TwitterModule {}
