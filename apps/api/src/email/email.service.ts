import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails disabled');
    }
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    if (!this.resend) return;
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    try {
      await this.resend!.emails.send({
        from: 'eWork Social <noreply@eworksocial.com>',
        to: email,
        subject: 'Verify your eWork Social account',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#080C14;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#0C1524;border-radius:16px;border:1px solid #1A2840;">
          <tr><td style="background:linear-gradient(135deg,#1a37c8,#2563EB);padding:28px;text-align:center;border-radius:16px 16px 0 0;">
          <span style="font-size:20px;font-weight:700;color:white;">⚡ eWork Social</span></td></tr>
          <tr><td style="padding:36px 40px;">
          <h1 style="color:#F0F6FF;font-size:22px;font-weight:700;margin:0 0 12px;">Welcome, ${name}! 👋</h1>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 28px;">You are almost ready to start managing your clients social media. Verify your email to activate your account.</p>
          <div style="text-align:center;margin:0 0 28px;">
          <a href="${verifyUrl}" style="display:inline-block;background:#2563EB;color:white;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">Verify Email Address</a>
          </div>
          <p style="color:#3A506B;font-size:12px;">This link expires in 48 hours. If you did not create an account, ignore this email.</p>
          </td></tr>
          <tr><td style="padding:20px 40px;border-top:1px solid #1A2840;text-align:center;">
          <p style="color:#2A3A52;font-size:12px;margin:0;">2025 eWork Social</p>
          </td></tr></table></td></tr></table>
          </body></html>`,
      });
    } catch (err) {
      this.logger.error('Failed to send verification email', err);
    }
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    if (!this.resend) return;
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    try {
      await this.resend!.emails.send({
        from: 'eWork Social <noreply@eworksocial.com>',
        to: email,
        subject: 'Reset your eWork Social password',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#080C14;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#0C1524;border-radius:16px;border:1px solid #1A2840;">
          <tr><td style="background:linear-gradient(135deg,#1a37c8,#2563EB);padding:28px;text-align:center;border-radius:16px 16px 0 0;">
          <span style="font-size:20px;font-weight:700;color:white;">⚡ eWork Social</span></td></tr>
          <tr><td style="padding:36px 40px;">
          <h1 style="color:#F0F6FF;font-size:22px;font-weight:700;margin:0 0 12px;">Reset your password 🔐</h1>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 8px;">Hi ${name},</p>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 28px;">We received a request to reset your password. Click the button below to choose a new one.</p>
          <div style="text-align:center;margin:0 0 28px;">
          <a href="${resetUrl}" style="display:inline-block;background:#2563EB;color:white;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">Reset Password</a>
          </div>
          <p style="color:#3A506B;font-size:12px;margin:0 0 8px;">This link expires in 1 hour.</p>
          <p style="color:#3A506B;font-size:12px;">If you did not request a password reset, you can safely ignore this email.</p>
          </td></tr>
          <tr><td style="padding:20px 40px;border-top:1px solid #1A2840;text-align:center;">
          <p style="color:#2A3A52;font-size:12px;margin:0;">2025 eWork Social</p>
          </td></tr></table></td></tr></table>
          </body></html>`,
      });
    } catch (err) {
      this.logger.error('Failed to send password reset email', err);
    }
  }

  async sendWelcomeEmail(email: string, name: string) {
    if (!this.resend) return;
    try {
      await this.resend!.emails.send({
        from: 'eWork Social <noreply@eworksocial.com>',
        to: email,
        subject: 'Your account is verified — welcome to eWork Social!',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#080C14;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#0C1524;border-radius:16px;border:1px solid #1A2840;">
          <tr><td style="background:linear-gradient(135deg,#1a37c8,#2563EB);padding:28px;text-align:center;border-radius:16px 16px 0 0;">
          <span style="font-size:20px;font-weight:700;color:white;">⚡ eWork Social</span></td></tr>
          <tr><td style="padding:36px 40px;">
          <h1 style="color:#F0F6FF;font-size:22px;font-weight:700;margin:0 0 12px;">You are all set, ${name}! 🎉</h1>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 28px;">Your email is verified. Your 7-day free trial is now active.</p>
          <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:#2563EB;color:white;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">Go to Dashboard</a>
          </td></tr></table></td></tr></table>
          </body></html>`,
      });
    } catch (err) {
      this.logger.error('Failed to send welcome email', err);
    }
  }

  async sendDay2OnboardingEmail(email: string, name: string) {
    if (!this.resend) return;
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard/settings?tab=social`;
    try {
      await this.resend!.emails.send({
        from: 'Bernard from eWork Social <noreply@eworksocial.com>',
        to: email,
        subject: `${name}, have you connected your social accounts yet?`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#080C14;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#0C1524;border-radius:16px;border:1px solid #1A2840;">
          <tr><td style="background:linear-gradient(135deg,#1a37c8,#2563EB);padding:28px;text-align:center;border-radius:16px 16px 0 0;">
          <span style="font-size:20px;font-weight:700;color:white;">⚡ eWork Social</span></td></tr>
          <tr><td style="padding:36px 40px;">
          <h1 style="color:#F0F6FF;font-size:22px;font-weight:700;margin:0 0 12px;">Hey ${name} 👋</h1>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 16px;">You signed up 2 days ago but haven't connected a social account yet.</p>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 28px;">Connecting takes less than 2 minutes and unlocks scheduling, analytics and auto-responder for your clients.</p>
          <div style="text-align:center;margin:0 0 28px;">
          <a href="${dashboardUrl}" style="display:inline-block;background:#2563EB;color:white;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">Connect Social Accounts →</a>
          </div>
          <p style="color:#3A506B;font-size:13px;">You have 5 days left on your free trial. Make the most of it!</p>
          </td></tr>
          <tr><td style="padding:20px 40px;border-top:1px solid #1A2840;text-align:center;">
          <p style="color:#2A3A52;font-size:12px;margin:0;">© 2025 eWork Social · <a href="${process.env.FRONTEND_URL}" style="color:#2A3A52;">Visit Dashboard</a></p>
          </td></tr></table></td></tr></table>
          </body></html>`,
      });
    } catch (err) {
      this.logger.error('Failed to send day 2 email', err);
    }
  }

  async sendDay5TrialReminderEmail(email: string, name: string) {
    if (!this.resend) return;
    const upgradeUrl = `${process.env.FRONTEND_URL}/dashboard/settings?tab=plan`;
    try {
      await this.resend!.emails.send({
        from: 'Bernard from eWork Social <noreply@eworksocial.com>',
        to: email,
        subject: `⏰ 2 days left on your eWork Social trial, ${name}`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#080C14;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#0C1524;border-radius:16px;border:1px solid #1A2840;">
          <tr><td style="background:linear-gradient(135deg,#c8531a,#e05a1a);padding:28px;text-align:center;border-radius:16px 16px 0 0;">
          <span style="font-size:20px;font-weight:700;color:white;">⚡ eWork Social · Trial Ending Soon</span></td></tr>
          <tr><td style="padding:36px 40px;">
          <h1 style="color:#F0F6FF;font-size:22px;font-weight:700;margin:0 0 12px;">Your trial ends in 2 days ⏰</h1>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${name}, your free trial of eWork Social expires in 2 days.</p>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 28px;">Upgrade now to keep access to your scheduler, CRM, analytics and all your connected accounts. Our Starter plan is just ₦5,000/month.</p>
          <div style="text-align:center;margin:0 0 28px;">
          <a href="${upgradeUrl}" style="display:inline-block;background:#2563EB;color:white;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">Upgrade My Plan →</a>
          </div>
          <p style="color:#3A506B;font-size:13px;">No action needed if you've already upgraded. Thank you for being a subscriber!</p>
          </td></tr>
          <tr><td style="padding:20px 40px;border-top:1px solid #1A2840;text-align:center;">
          <p style="color:#2A3A52;font-size:12px;margin:0;">© 2025 eWork Social</p>
          </td></tr></table></td></tr></table>
          </body></html>`,
      });
    } catch (err) {
      this.logger.error('Failed to send day 5 reminder email', err);
    }
  }

  async sendTrialExpiredEmail(email: string, name: string) {
    if (!this.resend) return;
    const upgradeUrl = `${process.env.FRONTEND_URL}/dashboard/settings?tab=plan`;
    try {
      await this.resend!.emails.send({
        from: 'Bernard from eWork Social <noreply@eworksocial.com>',
        to: email,
        subject: `Your eWork Social trial has ended, ${name}`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#080C14;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#0C1524;border-radius:16px;border:1px solid #1A2840;">
          <tr><td style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:28px;text-align:center;border-radius:16px 16px 0 0;">
          <span style="font-size:20px;font-weight:700;color:white;">⚡ eWork Social · Trial Ended</span></td></tr>
          <tr><td style="padding:36px 40px;">
          <h1 style="color:#F0F6FF;font-size:22px;font-weight:700;margin:0 0 12px;">Your free trial has ended 🔒</h1>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${name}, your 7-day free trial of eWork Social has ended.</p>
          <p style="color:#6B8299;font-size:15px;line-height:1.7;margin:0 0 28px;">Upgrade to a paid plan to restore full access. Your data is safe and waiting for you. Start with our Starter plan at just ₦5,000/month — less than a client lunch.</p>
          <div style="text-align:center;margin:0 0 16px;">
          <a href="${upgradeUrl}" style="display:inline-block;background:#2563EB;color:white;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">Restore My Access →</a>
          </div>
          <p style="color:#3A506B;font-size:13px;text-align:center;">Questions? Reply to this email — we reply within 24 hours.</p>
          </td></tr>
          <tr><td style="padding:20px 40px;border-top:1px solid #1A2840;text-align:center;">
          <p style="color:#2A3A52;font-size:12px;margin:0;">© 2025 eWork Social</p>
          </td></tr></table></td></tr></table>
          </body></html>`,
      });
    } catch (err) {
      this.logger.error('Failed to send trial expired email', err);
    }
  }


  async sendAutomationEmail(data: {
    to: string;
    subject: string;
    body: string;
    replyTo?: string;
    workspaceName: string;
  }) {
    try {
      await this.resend!.emails.send({
        from: 'eWork Social <noreply@eworksocial.com>',
        to: data.to,
        subject: data.subject,
        replyTo: data.replyTo,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
            <div style="margin-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 700; color: #0f172a;">${data.workspaceName}</span>
              <span style="font-size: 12px; color: #94a3b8; margin-left: 8px;">via eWork Social</span>
            </div>
            <div style="color: #334155; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${data.body}</div>
            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px;">Sent via eWork Social · eworksocial.com</p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send automation email', err);
    }
  }

}