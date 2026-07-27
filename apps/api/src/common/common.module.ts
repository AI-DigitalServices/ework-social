import { Module, Global } from '@nestjs/common';
import { PlanGuardService } from './plan-guard.service';
import { WorkspaceMemberGuard } from './workspace-member.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PlanGuardService, WorkspaceMemberGuard],
  exports: [PlanGuardService, WorkspaceMemberGuard],
})
export class CommonModule {}
