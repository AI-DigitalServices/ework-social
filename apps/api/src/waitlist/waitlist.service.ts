import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async join(dto: JoinWaitlistDto) {
    // Check if already on list
    const existing = await this.prisma.waitlist.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      // Silently succeed — don't reveal if already registered
      const total = await this.prisma.waitlist.count();
      return { success: true, position: total, alreadyJoined: true };
    }

    const entry = await this.prisma.waitlist.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name?.trim() || null,
        source: dto.source || 'landing_page',
      },
    });

    const position = await this.prisma.waitlist.count();

    // Send confirmation email (non-blocking)
    this.emailService
      .sendWaitlistConfirmationEmail(entry.email, entry.name || 'Friend', position)
      .catch((err) => this.logger.error('Failed to send waitlist email', err));

    this.logger.log(`New waitlist signup: ${entry.email} (#${position})`);

    return { success: true, position };
  }

  async getCount() {
    return this.prisma.waitlist.count();
  }
}
