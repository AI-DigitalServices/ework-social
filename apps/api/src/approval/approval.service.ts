import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { getPlanLimits } from '../common/plan-limits';
import { NotificationsService } from '../notifications/notifications.service';
import { PostHogService } from '../analytics/posthog.service';

@Injectable()
export class ApprovalService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
    private notifications: NotificationsService,
    private posthog: PostHogService,
  ) {}

  // Agency sends post for client approval
  async sendForApproval(
    postId: string,
    workspaceId: string,
    clientEmail: string,
    clientName: string,
    clientId?: string,
  ) {
    // Check plan limits
    const subscription = await this.prisma.subscription.findUnique({ where: { workspaceId } });
    const limits = getPlanLimits(subscription?.plan || 'FREE');
    // Allow all plans to test approval portal during trial
    // In production, gate this to Agency Pro only after trial
    if (!limits.clientApprovalEnabled) {
      throw new ForbiddenException('Client Approval Portal is available on Agency Pro plan. Start your trial to test this feature.');
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true, workspace: true },
    });

    if (!post) throw new NotFoundException('Post not found');
    if (post.workspaceId !== workspaceId) throw new BadRequestException('Unauthorized');

    // Delete existing approval if any
    await this.prisma.postApproval.deleteMany({ where: { postId } });

    // Create new approval request
    const approval = await this.prisma.postApproval.create({
      data: {
        postId,
        workspaceId,
        clientId: clientId || null,
        clientEmail,
        clientName,
        status: 'PENDING',
        emailSentAt: new Date(),
      },
    });

    // Update post status to PENDING_APPROVAL
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'PENDING_APPROVAL' as any },
    });

    // Send email to client
    const approvalUrl = `${this.config.get('FRONTEND_URL')}/approve/${approval.token}`;
    await this.sendApprovalEmail(clientEmail, clientName, post, approvalUrl);

    this.posthog.capture(workspaceId, 'approval_sent', { platform: post.socialAccount?.platform, clientName });

    return { success: true, token: approval.token, approvalUrl };
  }

  // Public endpoint — client views the approval page (no login needed)
  async getApprovalByToken(token: string) {
    const approval = await this.prisma.postApproval.findUnique({
      where: { token },
      include: {
        post: {
          include: { socialAccount: true },
        },
        workspace: true,
      },
    });

    if (!approval) throw new NotFoundException('Approval link not found or expired');

    return {
      id: approval.id,
      token: approval.token,
      status: approval.status,
      clientName: approval.clientName,
      revisionNote: approval.revisionNote,
      workspace: {
        name: approval.workspace.name,
        logo: approval.workspace.logo,
      },
      post: {
        id: approval.post.id,
        content: approval.post.content,
        mediaUrls: approval.post.mediaUrls,
        scheduledAt: approval.post.scheduledAt,
        platform: approval.post.socialAccount?.platform,
        accountName: approval.post.socialAccount?.accountName,
      },
    };
  }

  // Client approves post
  async approvePost(token: string) {
    const approval = await this.prisma.postApproval.findUnique({ where: { token } });
    if (!approval) throw new NotFoundException('Approval link not found');
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('This post has already been reviewed');
    }

    await this.prisma.postApproval.update({
      where: { token },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        respondedAt: new Date(),
      },
    });

    await this.prisma.post.update({
      where: { id: approval.postId },
      data: { status: 'DRAFT' },
    });

    // Notify workspace owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: approval.workspaceId },
      select: { ownerId: true },
    });
    if (workspace) {
      await this.notifications.createNotification(
        workspace.ownerId,
        'approval',
        '✅ Post Approved',
        `${approval.clientName} approved your post. It is ready to publish.`,
      );
    }

    this.posthog.capture(approval.workspaceId, 'approval_approved', { clientName: approval.clientName });

    return { success: true, message: 'Post approved successfully' };
  }

  // Client requests revision
  async requestRevision(token: string, revisionNote: string) {
    const approval = await this.prisma.postApproval.findUnique({ where: { token } });
    if (!approval) throw new NotFoundException('Approval link not found');
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('This post has already been reviewed');
    }

    await this.prisma.postApproval.update({
      where: { token },
      data: {
        status: 'REVISION_REQUESTED',
        revisionNote,
        respondedAt: new Date(),
      },
    });

    await this.prisma.post.update({
      where: { id: approval.postId },
      data: { status: 'DRAFT' },
    });

    // Notify workspace owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: approval.workspaceId },
      select: { ownerId: true },
    });
    if (workspace) {
      await this.notifications.createNotification(
        workspace.ownerId,
        'approval',
        '✏️ Revision Requested',
        `${approval.clientName} requested changes: "${revisionNote?.slice(0, 80)}..."`,
      );
    }

    this.posthog.capture(approval.workspaceId, 'approval_revision_requested', { clientName: approval.clientName });

    return { success: true, message: 'Revision request sent to agency' };
  }

  // Get all approvals for a workspace (agency view)
  async getWorkspaceApprovals(workspaceId: string) {
    return this.prisma.postApproval.findMany({
      where: { workspaceId },
      include: {
        post: {
          include: { socialAccount: true },
        },
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async sendApprovalEmail(
    clientEmail: string,
    clientName: string,
    post: any,
    approvalUrl: string,
  ) {
    const platformName = post.socialAccount?.platform || 'Social Media';
    const scheduledDate = post.scheduledAt
      ? new Date(post.scheduledAt).toLocaleDateString('en-NG', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
      : 'To be scheduled';

    await this.email.sendEmail({
      to: clientEmail,
      subject: `Content ready for your review — ${platformName}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #080C14; color: #C8D8E8; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #185FA5, #0D3A6B); padding: 32px 40px; text-align: center;">
            <div style="font-size: 24px; font-weight: 900; color: #fff; letter-spacing: -0.5px;">
              eWork<span style="color: #378ADD;">/</span>Social
            </div>
            <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 14px;">Content Approval Request</p>
          </div>

          <div style="padding: 36px 40px;">
            <h2 style="color: #fff; font-size: 20px; margin: 0 0 8px;">Hi ${clientName},</h2>
            <p style="color: #7A8FA6; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              Your agency has prepared a post for <strong style="color: #C8D8E8;">${platformName}</strong> 
              scheduled for <strong style="color: #C8D8E8;">${scheduledDate}</strong>. 
              Please review and approve before it goes live.
            </p>

            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-left: 3px solid #378ADD; border-radius: 8px; padding: 20px 24px; margin-bottom: 28px;">
              <p style="color: #9BB0C5; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; margin: 0 0 10px;">POST CONTENT</p>
              <p style="color: #C8D8E8; font-size: 14px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${post.content?.slice(0, 300)}${post.content?.length > 300 ? '...' : ''}</p>
            </div>

            <div style="text-align: center; margin-bottom: 28px;">
              <a href="${approvalUrl}" style="display: inline-block; background: linear-gradient(135deg, #185FA5, #378ADD); color: #fff; font-size: 15px; font-weight: 700; padding: 16px 40px; border-radius: 10px; text-decoration: none; letter-spacing: 0.02em;">
                Review &amp; Approve Post →
              </a>
            </div>

            <p style="color: #4A6080; font-size: 13px; text-align: center; margin: 0;">
              You can approve or request changes directly from the review page. No login required.
            </p>
          </div>

          <div style="background: rgba(0,0,0,0.3); padding: 20px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
            <p style="color: #2A3A52; font-size: 12px; margin: 0;">
              Powered by eWork Social · A product of Jben Logistics (RC: 1940369) · Lagos, Nigeria
            </p>
          </div>
        </div>
      `,
    });
  }
}
