import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtGuard } from './jwt.guard';
import { GoogleStrategy } from './google.strategy';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostHogModule } from '../analytics/posthog.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    EmailModule,
    NotificationsModule,
    PostHogModule,
  ],
  providers: [AuthService, JwtGuard, GoogleStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtGuard, JwtModule],
})
export class AuthModule {}
