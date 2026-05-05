import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { DataDeletionController } from './data-deletion.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SocialController, DataDeletionController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
