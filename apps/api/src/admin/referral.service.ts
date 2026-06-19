import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

// Commission structure
// Founding Partner: 30% for 24 months
// Standard: 20% for 12 months then 10% residual
// Founding member pricing (50% off standard rates)
// Commission is calculated on what the referred user actually pays
const NAIRA_PLAN_PRICES: Record<string, number> = {
  STARTER: 2500,    // ₦5,000 × 50% off
  GROWTH: 6000,     // ₦12,000 × 50% off
  AGENCY_PRO: 15000, // ₦30,000 × 50% off
};

function getCommissionRate(isFoundingPartner: boolean): number {
  return isFoundingPartner ? 0.30 : 0.20;
}

@Injectable()
export class ReferralService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

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

    // Check if this user is a founding partner via explicit flag
    const referrerUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, isFoundingPartner: true },
    });
    const isFoundingPartner = referrerUser?.isFoundingPartner ?? false;

    const commissionRate = getCommissionRate(isFoundingPartner);

    const paying = referrals.filter(r =>
      ['STARTER', 'GROWTH', 'AGENCY_PRO'].includes(r.ownedWorkspaces[0]?.subscription?.plan || '')
    );

    const commission = paying.reduce((total, r) => {
      const plan = r.ownedWorkspaces[0]?.subscription?.plan;
      const price = NAIRA_PLAN_PRICES[plan || ''] || 0;
      return total + (price * commissionRate);
    }, 0);

    return {
      referralCode: user.referralCode,
      referralLink: `https://app.eworksocial.com/register?ref=${user.referralCode}`,
      totalReferrals: referrals.length,
      payingReferrals: paying.length,
      estimatedCommission: Math.round(commission),
      isFoundingPartner,
      commissionRate: commissionRate * 100,
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

  async requestWithdrawal(userId: string, amount: number, paymentDetails: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, referralCode: true },
    });
    if (!user) throw new Error('User not found');

    // Notify admin via email
    await this.email.sendEmail({
      to: 'admin@eworksocial.com',
      subject: `Withdrawal Request — ${user.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #185FA5;">New Withdrawal Request</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${user.name}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${user.email}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Referral Code</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${user.referralCode}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount Requested</strong></td><td style="padding: 8px; border: 1px solid #ddd;">₦${amount.toLocaleString()}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Details</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${paymentDetails}</td></tr>
          </table>
          <p style="color: #666; margin-top: 16px;">Please process this withdrawal via Paystack transfer.</p>
        </div>
      `,
    });

    // Notify user their request was received
    await this.email.sendEmail({
      to: user.email,
      subject: 'Withdrawal Request Received — eWork Social',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #080C14; color: #C8D8E8; padding: 32px; border-radius: 12px;">
          <h2 style="color: #378ADD;">Withdrawal Request Received</h2>
          <p>Hi ${user.name},</p>
          <p>We've received your withdrawal request for <strong style="color: #10B981;">₦${amount.toLocaleString()}</strong>.</p>
          <p>We'll process this within 3-5 business days via Paystack transfer to your provided account details.</p>
          <p style="color: #4A6080; font-size: 13px;">Questions? Reply to this email or WhatsApp Bernard directly.</p>
        </div>
      `,
    });

    return { success: true, message: 'Withdrawal request submitted. You will be paid within 3-5 business days.' };
  }
}
