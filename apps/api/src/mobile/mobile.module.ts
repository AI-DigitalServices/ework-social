import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MobileController } from './mobile.controller';
import { MobileAuthService } from './mobile-auth.service';
import { MobileConfigService } from './mobile-config.service';
import { MobileDevicesService } from './mobile-devices.service';

// PrismaService, PlanGuardService and WorkspaceMemberGuard come from the global
// Prisma/Common modules. AuthModule supplies AuthService, JwtGuard and JwtModule.
@Module({
  imports: [AuthModule],
  controllers: [MobileController],
  providers: [MobileAuthService, MobileConfigService, MobileDevicesService],
})
export class MobileModule {}
