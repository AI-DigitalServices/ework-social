import { Module } from '@nestjs/common';
import { LinkedInEngagementService } from './linkedin-engagement.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LinkedInEngagementService],
  exports: [LinkedInEngagementService],
})
export class LinkedInEngagementModule {}
