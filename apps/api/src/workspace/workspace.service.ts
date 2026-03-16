import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async inviteMember(workspaceId: string, inviteEmail: string, role: string, inviterId: string) {
    // Check inviter is owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });
    if (!workspace) throw new BadRequestException('Workspace not found');
    if (workspace.ownerId !== inviterId) throw new ForbiddenException('Only workspace owner can invite members');

    // Check plan limits
    const memberCount = workspace.members.length + 1; // +1 for owner
    
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({ where: { email: inviteEmail } });
    
    // Check if already a member
    if (existingUser) {
      const alreadyMember = workspace.members.find(m => m.userId === existingUser.id);
      if (alreadyMember) throw new BadRequestException('User is already a member');
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store invite
    await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: inviteEmail,
        role: role as any,
        token,
        expiresAt,
        invitedById: inviterId,
      },
    });

    // Send invite email
    const inviter = await this.prisma.user.findUnique({ where: { id: inviterId } });
    const acceptUrl = `${process.env.FRONTEND_URL}/invite/accept?token=${token}`;
    
    await this.email.sendInviteEmail(inviteEmail, inviter?.name || 'Someone', workspace.name, acceptUrl);

    return { success: true, message: `Invite sent to ${inviteEmail}` };
  }

  async acceptInvite(token: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({ where: { token } });
    if (!invite) throw new BadRequestException('Invalid invite token');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite has expired');
    if (invite.acceptedAt) throw new BadRequestException('Invite already accepted');

    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { email: invite.email } });
    if (!user) {
      // Return info so frontend can redirect to register
      return { 
        needsRegistration: true, 
        email: invite.email, 
        workspaceId: invite.workspaceId,
        token 
      };
    }

    // Add user to workspace
    await this.prisma.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
      },
    });

    // Mark invite as accepted
    await this.prisma.workspaceInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    const workspace = await this.prisma.workspace.findUnique({ where: { id: invite.workspaceId } });
    return { success: true, workspaceId: invite.workspaceId, workspaceName: workspace?.name };
  }

  async getMembers(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!workspace) throw new BadRequestException('Workspace not found');

    const owner = { ...workspace.owner, role: 'OWNER', isOwner: true };
    const members = workspace.members.map(m => ({ ...m.user, role: m.role, isOwner: false, memberId: m.id }));
    
    // Get pending invites
    const pendingInvites = await this.prisma.workspaceInvite.findMany({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    const pending = pendingInvites.map(i => ({
      id: i.id, name: i.email.split('@')[0], email: i.email,
      role: i.role, isOwner: false, isPending: true, inviteToken: i.token,
    }));
    
    return [owner, ...members, ...pending];
  }

  async removeMember(workspaceId: string, userId: string, requesterId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (workspace?.ownerId !== requesterId) throw new ForbiddenException('Only owner can remove members');
    if (userId === requesterId) throw new BadRequestException('Cannot remove yourself');

    await this.prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId },
    });
    return { success: true };
  }
}
