import { Injectable, Logger } from '@nestjs/common';
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
    return this.prisma.automationRule.update({
      where: { id },
      data,
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
