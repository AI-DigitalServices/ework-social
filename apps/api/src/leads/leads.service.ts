import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const SALES_EMAIL = process.env.SALES_EMAIL || 'sales@eworksocial.com';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async createEnterpriseLead(dto: {
    name?: string;
    email?: string;
    company?: string;
    message?: string;
    interest?: string;
  }) {
    const name = (dto.name || '').trim();
    const email = (dto.email || '').trim();
    if (!name || !email) throw new BadRequestException('Name and email are required.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestException('Please enter a valid email.');

    const interest = dto.interest === 'managed' ? 'managed' : 'software';

    // Save to DB — but if the table isn't there yet (migration not run), don't
    // lose the lead: log it and still fire the email below so it's never dropped.
    let leadId: string | null = null;
    try {
      const lead = await this.prisma.enterpriseLead.create({
        data: {
          name,
          email,
          company: dto.company?.trim() || null,
          message: dto.message?.trim() || null,
          interest,
        },
      });
      leadId = lead.id;
    } catch (err: any) {
      this.logger.error(`EnterpriseLead DB save failed (table missing?) — continuing to email: ${err.message}`);
    }

    // Notify sales — best-effort, never fail the request if email hiccups.
    try {
      await this.email.sendEmail({
        to: SALES_EMAIL,
        subject: `New Enterprise lead: ${name}${dto.company ? ` (${dto.company})` : ''}`,
        html: `
          <h2>New Enterprise lead</h2>
          <p><strong>Interest:</strong> ${interest === 'managed' ? 'Managed service (done-for-you)' : 'Enterprise software'}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${dto.company?.trim() || '—'}</p>
          <p><strong>Message:</strong><br/>${(dto.message?.trim() || '—').replace(/\n/g, '<br/>')}</p>
          <hr/>
          <p style="color:#888">Captured from the eWork Social pricing page.</p>
        `,
      });
    } catch (err: any) {
      this.logger.error(`Enterprise lead email failed (lead still saved): ${err.message}`);
    }

    return { ok: true, id: leadId };
  }
}
