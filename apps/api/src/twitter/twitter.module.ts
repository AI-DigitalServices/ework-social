import { Module } from '@nestjs/common';
import { TwitterPollerService } from './twitter-poller.service';
import { TwitterController } from './twitter.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TwitterController],
  providers: [TwitterPollerService],
  exports: [TwitterPollerService],
})
export class TwitterModule {}
