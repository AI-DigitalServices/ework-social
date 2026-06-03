import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // Runs every day at 9am — nudges unverified users to confirm their email
  @Cron('0 9 * * *')
  async runVerificationReminders() {
    this.logger.log('Running verification reminder sequence...');
    const now = new Date();

    const unverifiedUsers = await this.prisma.user.findMany({
      where: { isVerified: false },
    });

    for (const user of unverifiedUsers) {
      const hoursSinceSignup = (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60);
      const daysSinceSignup = Math.floor(hoursSinceSignup / 24);

      // Refresh the token so the link stays valid for each reminder
      const newToken = crypto.randomBytes(32).toString('hex');
      const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: newToken, verificationExpiry: newExpiry },
      });

      try {
        if (daysSinceSignup === 1) {
          await this.email.sendVerificationReminderEmail(user.email, user.name, newToken, false);
          this.logger.log(`Verification reminder (day 1) sent to ${user.email}`);
        } else if (daysSinceSignup === 3) {
          await this.email.sendVerificationReminderEmail(user.email, user.name, newToken, false);
          this.logger.log(`Verification reminder (day 3) sent to ${user.email}`);
        } else if (daysSinceSignup === 6) {
          await this.email.sendVerificationReminderEmail(user.email, user.name, newToken, true);
          this.logger.log(`Verification reminder (day 6 — urgent) sent to ${user.email}`);
        } else if (daysSinceSignup > 6 && daysSinceSignup % 7 === 0) {
          // Weekly nudge after day 6 until they verify
          await this.email.sendVerificationReminderEmail(user.email, user.name, newToken, true);
          this.logger.log(`Verification reminder (day ${daysSinceSignup} — weekly) sent to ${user.email}`);
        }
      } catch (err) {
        this.logger.error(`Failed verification reminder for ${user.email}`, err);
      }
    }
  }

  @Cron('0 9 * * *')
  async runOnboardingSequence() {
    this.logger.log('Running daily onboarding email sequence...');
    const now = new Date();

    const users = await this.prisma.user.findMany({
      where: { isVerified: true },
      include: {
        ownedWorkspaces: {
          include: { subscription: true },
          take: 1,
        },
      },
    });

    for (const user of users) {
      const workspace = user.ownedWorkspaces[0];
      if (!workspace) continue;
      const sub = workspace.subscription;
      if (!sub) continue;
      if (sub.status === 'ACTIVE' && sub.plan !== 'FREE') continue;
      const trialEndsAt = sub.trialEndsAt;
      if (!trialEndsAt) continue;

      const daysSinceSignup = Math.floor(
        (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysUntilExpiry = Math.ceil(
        (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      try {
        if (daysSinceSignup === 2) {
          const hasSocialAccounts = await this.prisma.socialAccount.count({
            where: { workspaceId: workspace.id },
          });
          if (hasSocialAccounts === 0) {
            await this.email.sendDay2OnboardingEmail(user.email, user.name);
            this.logger.log(`Day 2 email sent to ${user.email}`);
          }
        }
        if (daysUntilExpiry === 2) {
          await this.email.sendDay5TrialReminderEmail(user.email, user.name);
          this.logger.log(`Day 5 reminder sent to ${user.email}`);
        }
        if (daysUntilExpiry <= 0 && daysSinceSignup === 7) {
          await this.email.sendTrialExpiredEmail(user.email, user.name);
          this.logger.log(`Trial expired email sent to ${user.email}`);
        }
      } catch (err) {
        this.logger.error(`Failed onboarding email for ${user.email}`, err);
      }
    }
  }
}
