import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';

// Creative Hub (AI OS v2, section 13.1) — additive module, asset management
// on top of the existing Supabase bucket. See eWorkSocial_AI_OS_Blueprint.
@Module({
  imports: [CommonModule, AuthModule, AiModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
