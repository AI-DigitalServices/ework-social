import { resolveWorkspaceRole } from './workspace-role.util';

function prismaWith(member: any, ownerId: string | null) {
  return {
    workspaceMember: { findFirst: jest.fn().mockResolvedValue(member) },
    workspace: { findUnique: jest.fn().mockResolvedValue(ownerId ? { ownerId } : null) },
  } as any;
}

describe('resolveWorkspaceRole', () => {
  it('returns the member role', async () => {
    const prisma = prismaWith({ role: 'EDITOR' }, 'someone-else');
    await expect(resolveWorkspaceRole(prisma, 'w1', 'u1')).resolves.toBe('EDITOR');
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith({ where: { workspaceId: 'w1', userId: 'u1' }, select: { role: true } });
  });

  it('treats the workspace owner as OWNER even with no member row', async () => {
    await expect(resolveWorkspaceRole(prismaWith(null, 'u1'), 'w1', 'u1')).resolves.toBe('OWNER');
  });

  it('returns null for someone who is neither', async () => {
    await expect(resolveWorkspaceRole(prismaWith(null, 'owner'), 'w1', 'u1')).resolves.toBeNull();
    await expect(resolveWorkspaceRole(prismaWith(null, null), 'w1', 'u1')).resolves.toBeNull();
  });

  it('returns null without touching the database when ids are missing', async () => {
    const prisma = prismaWith({ role: 'OWNER' }, 'u1');
    await expect(resolveWorkspaceRole(prisma, '', 'u1')).resolves.toBeNull();
    await expect(resolveWorkspaceRole(prisma, 'w1', '')).resolves.toBeNull();
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled();
  });
});
