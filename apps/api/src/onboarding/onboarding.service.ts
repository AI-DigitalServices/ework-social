import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

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
