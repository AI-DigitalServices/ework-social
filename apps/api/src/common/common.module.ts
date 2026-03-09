import { Module } from '@nestjs/common';
import { PlanGuardService } from './plan-guard.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PlanGuardService],
  exports: [PlanGuardService],
})
export class CommonModule {}
