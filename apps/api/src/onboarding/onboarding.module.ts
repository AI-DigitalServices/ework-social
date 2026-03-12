import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  providers: [OnboardingService],
})
export class OnboardingModule {}
