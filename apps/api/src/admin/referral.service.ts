import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  async generateReferralCode(userId: string): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (existing?.referralCode) return existing.referralCode;

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });
    return code;
  }

  async getReferralStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user?.referralCode) {
      const code = await this.generateReferralCode(userId);
      return this.getReferralStats(userId);
    }

    const referrals = await this.prisma.user.findMany({
      where: { referredById: userId },
      include: {
        ownedWorkspaces: {
          include: { subscription: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const paying = referrals.filter(r =>
      ['STARTER', 'GROWTH', 'AGENCY_PRO'].includes(r.ownedWorkspaces[0]?.subscription?.plan || '')
    );

    const commission = paying.reduce((total, r) => {
      const plan = r.ownedWorkspaces[0]?.subscription?.plan;
      const rates: Record<string, number> = { STARTER: 1, GROWTH: 2.4, AGENCY_PRO: 5.8 };
      return total + (rates[plan || ''] || 0);
    }, 0);

    return {
      referralCode: user.referralCode,
      referralLink: `https://app.eworksocial.com/register?ref=${user.referralCode}`,
      totalReferrals: referrals.length,
      payingReferrals: paying.length,
      estimatedCommission: Math.round(commission * 100) / 100,
      referrals: referrals.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        plan: r.ownedWorkspaces[0]?.subscription?.plan || 'FREE',
        joinedAt: r.createdAt,
        isVerified: r.isVerified,
      })),
    };
  }

  async getAllReferralStats() {
    const topReferrers = await this.prisma.user.findMany({
      where: { referralCode: { not: null } },
      include: {
        referrals: {
          include: {
            ownedWorkspaces: { include: { subscription: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return topReferrers
      .filter(u => u.referrals.length > 0)
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        referralCode: u.referralCode,
        totalReferrals: u.referrals.length,
        payingReferrals: u.referrals.filter(r =>
          ['STARTER', 'GROWTH', 'AGENCY_PRO'].includes(r.ownedWorkspaces[0]?.subscription?.plan || '')
        ).length,
      }));
  }

  async trackReferral(code: string, newUserId: string) {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code },
    });
    if (!referrer) return;
    await this.prisma.user.update({
      where: { id: newUserId },
      data: { referredById: referrer.id },
    });
  }
}
