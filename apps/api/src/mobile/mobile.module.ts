import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { MobileController } from './mobile.controller';
import { MobileAuthService } from './mobile-auth.service';
import { MobileConfigService } from './mobile-config.service';
import { MobileDevicesService } from './mobile-devices.service';
import { MobileHomeService } from './mobile-home.service';
import { MobileNotificationsService } from './mobile-notifications.service';
import { MobilePostsService } from './mobile-posts.service';
import { MobileOnboardingController } from './mobile-onboarding.controller';
import { MobileOnboardingService } from './mobile-onboarding.service';
import { MobileCreateController } from './mobile-create.controller';
import { MobileCreateService } from './mobile-create.service';

// PrismaService, PlanGuardService and WorkspaceMemberGuard come from the global
// Prisma/Common modules. AuthModule supplies AuthService, JwtGuard and JwtModule;
// SchedulerModule exports SchedulerService, used to publish with the same code as the web.
@Module({
  imports: [AuthModule, SchedulerModule, AiModule],
  controllers: [MobileController, MobileOnboardingController, MobileCreateController],
  providers: [
    MobileAuthService,
    MobileConfigService,
    MobileDevicesService,
    MobileHomeService,
    MobileNotificationsService,
    MobilePostsService,
    MobileOnboardingService,
    MobileCreateService,
  ],
})
export class MobileModule {}
