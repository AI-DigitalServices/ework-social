import { BadRequestException, ForbiddenException } from '@nestjs/common';

jest.mock('../email/email.service', () => ({ EmailService: class {} }));

import { WorkspaceService } from './workspace.service';

function build() {
  const prisma: any = {
    workspace: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'w1',
        name: 'Acme',
        ownerId: 'owner1',
        members: [],
        owner: { id: 'owner1', name: 'Olu', email: 'o@x.com' },
      }),
    },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
    workspaceInvite: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([{ id: 'i1', email: 'new@x.com', role: 'VIEWER', token: 'SECRET-TOKEN' }]),
    },
  };
  const email: any = { sendInviteEmail: jest.fn().mockResolvedValue(undefined) };
  const planGuard: any = { checkTeamMemberLimit: jest.fn().mockResolvedValue(undefined) };
  return { prisma, email, planGuard, svc: new WorkspaceService(prisma, email, planGuard) };
}

describe('WorkspaceService.inviteMember', () => {
  it('only the owner can invite', async () => {
    const { svc, prisma } = build();
    await expect(svc.inviteMember('w1', 'a@x.com', 'EDITOR', 'someone-else')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.workspaceInvite.create).not.toHaveBeenCalled();
  });

  it('only ADMIN, EDITOR and VIEWER can be invited - never OWNER or an arbitrary string', async () => {
    const { svc, prisma } = build();
    for (const role of ['OWNER', 'GOD', '', undefined as any]) {
      await expect(svc.inviteMember('w1', 'a@x.com', role, 'owner1')).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(prisma.workspaceInvite.create).not.toHaveBeenCalled();
  });

  it('the plan team-size limit is enforced and stops the invite', async () => {
    const { svc, prisma, planGuard } = build();
    planGuard.checkTeamMemberLimit.mockRejectedValue(new ForbiddenException('Team limit reached.'));
    await expect(svc.inviteMember('w1', 'a@x.com', 'EDITOR', 'owner1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.workspaceInvite.create).not.toHaveBeenCalled();
  });

  it('a valid invite is created and emailed', async () => {
    const { svc, prisma, email } = build();
    const res = await svc.inviteMember('w1', 'a@x.com', 'EDITOR', 'owner1');
    expect(res.success).toBe(true);
    expect(prisma.workspaceInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ workspaceId: 'w1', email: 'a@x.com', role: 'EDITOR' }) }),
    );
    expect(email.sendInviteEmail).toHaveBeenCalledTimes(1);
  });
});

describe('WorkspaceService.getMembers', () => {
  it('shows pending invite tokens to owners and admins only', async () => {
    for (const role of ['OWNER', 'ADMIN']) {
      const { svc } = build();
      const list = await svc.getMembers('w1', role);
      expect((list as any[]).find((m: any) => m.isPending).inviteToken).toBe('SECRET-TOKEN');
    }
  });

  it('hides invite tokens from editors, viewers and unknown callers', async () => {
    for (const role of ['EDITOR', 'VIEWER', 'NONE', undefined]) {
      const { svc } = build();
      const list = await svc.getMembers('w1', role as any);
      expect((list as any[]).find((m: any) => m.isPending).inviteToken).toBeUndefined();
    }
  });
});
