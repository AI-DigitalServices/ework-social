import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CrmModule } from '../crm/crm.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyGuard } from './api-key.guard';
import { PublicApiService } from './public-api.service';
import { LeadCaptureService } from './lead-capture.service';
import { PublicApiController, CaptureController } from './public-api.controller';
import { ApiKeysController, LeadCaptureAdminController } from './integrations-admin.controller';

// Public REST API + API keys + website lead capture (PrismaModule and
// CommonModule are global, so PlanGuardService is available here).
@Module({
  imports: [AuthModule, CrmModule, WebhooksModule, SchedulerModule],
  controllers: [PublicApiController, CaptureController, ApiKeysController, LeadCaptureAdminController],
  providers: [ApiKeysService, ApiKeyGuard, PublicApiService, LeadCaptureService],
})
export class PublicApiModule {}
