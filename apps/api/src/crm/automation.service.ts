import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async getRules(workspaceId: string) {
    return this.prisma.automationRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(workspaceId: string, data: {
    name: string;
    triggerStage: string;
    subject: string;
    body: string;
    replyTo?: string;
  }) {
    const stages = ['LEAD', 'CONTACTED', 'PROPOSAL', 'ACTIVE', 'DORMANT'];
    const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
    if (!workspaceId) throw new BadRequestException('workspaceId is required.');
    if (!text(data?.name, 120) || !text(data?.subject, 200) || !text(data?.body, 10000)) {
      throw new BadRequestException('Name, subject and body are required.');
    }
    if (!stages.includes(data.triggerStage)) {
      throw new BadRequestException(`triggerStage must be one of: ${stages.join(', ')}.`);
    }
    return this.prisma.automationRule.create({
      data: {
        workspaceId,
        name: data.name,
        triggerStage: data.triggerStage as any,
        subject: data.subject,
        body: data.body,
        replyTo: data.replyTo,
      },
    });
  }

  async updateRule(id: string, data: Partial<{
    name: string;
    subject: string;
    body: string;
    replyTo: string;
    isActive: boolean;
  }>) {
    // Whitelist: never write fields the caller merely included in the request
    // (workspaceId, triggerStage, id, ...).
    const clean: Record<string, any> = {};
    const fields: Array<[string, number]> = [['name', 120], ['subject', 200], ['body', 10000], ['replyTo', 320]];
    for (const [key, max] of fields) {
      const v = (data as any)?.[key];
      if (v === undefined) continue;
      if (typeof v !== 'string' || v.length > max || (key !== 'replyTo' && !v.trim())) {
        throw new BadRequestException(`${key} is invalid.`);
      }
      clean[key] = key === 'replyTo' && v === '' ? null : v;
    }
    if ((data as any)?.isActive !== undefined) clean.isActive = !!(data as any).isActive;
    if (Object.keys(clean).length === 0) throw new BadRequestException('Nothing to update.');
    return this.prisma.automationRule.update({
      where: { id },
      data: clean,
    });
  }

  async deleteRule(id: string) {
    return this.prisma.automationRule.delete({ where: { id } });
  }

  async triggerStageAutomation(workspaceId: string, clientId: string, newStage: string) {
    // Find active rules for this stage
    const rules = await this.prisma.automationRule.findMany({
      where: { workspaceId, triggerStage: newStage as any, isActive: true },
    });

    if (rules.length === 0) return;

    // Get client details
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client?.email) {
      this.logger.log(`No email for client ${clientId} — skipping automation`);
      return;
    }

    // Get workspace name for personalization
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    for (const rule of rules) {
      try {
        // Replace template variables
        const subject = rule.subject
          .replace('{{name}}', client.name)
          .replace('{{stage}}', newStage)
          .replace('{{workspace}}', workspace?.name || 'Our Agency');

        const body = rule.body
          .replace('{{name}}', client.name)
          .replace('{{stage}}', newStage)
          .replace('{{workspace}}', workspace?.name || 'Our Agency');

        await this.email.sendAutomationEmail({
          to: client.email,
          subject,
          body,
          replyTo: rule.replyTo ?? undefined,
          workspaceName: workspace?.name || 'eWork Social',
        });

        this.logger.log(`Automation email sent to ${client.email} for stage ${newStage}`);
      } catch (err) {
        this.logger.error(`Failed to send automation email`, err);
      }
    }
  }
}
