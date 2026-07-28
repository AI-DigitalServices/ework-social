import { Module, Global } from '@nestjs/common';
import { PlanGuardService } from './plan-guard.service';
import { WorkspaceMemberGuard } from './workspace-member.guard';
import { AdminGuard } from './admin.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PlanGuardService, WorkspaceMemberGuard, AdminGuard],
  exports: [PlanGuardService, WorkspaceMemberGuard, AdminGuard],
})
export class CommonModule {}
