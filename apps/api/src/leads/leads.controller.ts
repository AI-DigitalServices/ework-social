import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';

// Public — the pricing page is unauthenticated. Rate-limited to deter spam.
@Controller('leads')
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Post('enterprise')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  createEnterprise(
    @Body() body: { name?: string; email?: string; company?: string; message?: string; interest?: string },
  ) {
    return this.leads.createEnterpriseLead(body || {});
  }
}
