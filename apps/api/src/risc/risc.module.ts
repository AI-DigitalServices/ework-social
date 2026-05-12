import { Module } from '@nestjs/common';
import { RiscController } from './risc.controller';
import { RiscService } from './risc.service';

@Module({
  controllers: [RiscController],
  providers: [RiscService],
})
export class RiscModule {}
