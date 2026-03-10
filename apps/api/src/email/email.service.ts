import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await this.resend.emails.send({
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
  }

  async sendWelcomeEmail(email: string, name: string) {
    await this.resend.emails.send({
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
  }
}
