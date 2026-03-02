import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtGuard } from './jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [AuthService, JwtGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtGuard, JwtModule],
})
export class AuthModule {}
