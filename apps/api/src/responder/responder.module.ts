import { Module } from '@nestjs/common';
import { ResponderService } from './responder.service';
import { ResponderController } from './responder.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [ResponderService],
  controllers: [ResponderController],
})
export class ResponderModule {}
