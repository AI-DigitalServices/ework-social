import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

// Max workspaces per plan
const WORKSPACE_LIMITS: Record<string, number> = {
  FREE:        1,
  STARTER:     3,
  GROWTH:      10,
  AGENCY_PRO:  100,
  ENTERPRISE:  999,
};

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async listWorkspaces(userId: string) {
    // All workspaces user owns
    const owned = await this.prisma.workspace.findMany({
      where: { ownerId: userId },
      include: { subscription: true },
    });

    // All workspaces user is a member of (but doesn't own)
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: { include: { subscription: true } },
      },
    });

    const memberWorkspaces = memberships
      .map(m => m.workspace)
      .filter(w => w.ownerId !== userId);

    return [...owned, ...memberWorkspaces].map(w => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      plan: w.subscription?.plan || 'FREE',
      isOwner: w.ownerId === userId,
    }));
  }

  async createWorkspace(userId: string, name: string) {
    // Get user's owned workspaces to check plan limit
    const ownedWorkspaces = await this.prisma.workspace.findMany({
      where: { ownerId: userId },
      include: { subscription: true },
    });

    // Use the plan of their first (primary) workspace
    const primaryPlan = ownedWorkspaces[0]?.subscription?.plan || 'FREE';
    const limit = WORKSPACE_LIMITS[primaryPlan] ?? 1;

    if (ownedWorkspaces.length >= limit) {
      throw new ForbiddenException(
        `Your ${primaryPlan} plan allows up to ${limit} workspace${limit === 1 ? '' : 's'}. Upgrade to create more.`
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50);

    // Ensure slug is unique
    const existing = await this.prisma.workspace.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        slug: finalSlug,
        ownerId: userId,
        members: {
          create: { userId, role: 'OWNER' as any },
        },
        subscription: {
          create: {
            plan: 'FREE',
            status: 'ACTIVE',
          },
        },
      },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: 'FREE',
      isOwner: true,
    };
  }

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
