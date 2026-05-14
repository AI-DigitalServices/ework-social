import { Controller, Post, Get, Body, HttpCode } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

@Controller('waitlist')
export class WaitlistController {
  constructor(private waitlistService: WaitlistService) {}

  // Public — no auth required
  @Post()
  @HttpCode(200)
  join(@Body() dto: JoinWaitlistDto) {
    return this.waitlistService.join(dto);
  }

  // Public count endpoint for the landing page counter
  @Get('count')
  getCount() {
    return this.waitlistService.getCount();
  }
}
