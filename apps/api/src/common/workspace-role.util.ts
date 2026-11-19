// Resolve a user's role in a workspace from the database. Used by routes that act
// on a record by id and so cannot rely on a workspaceId in the request: the role
// must come from the RECORD's workspace, never from anything the caller sends.

/** Member role, else OWNER for the workspace owner (legacy rows may have no member row), else null. */
export async function resolveWorkspaceRole(
  prisma: any,
  workspaceId: string,
  userId: string,
): Promise<string | null> {
  if (!workspaceId || !userId) return null;
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  });
  if (member) return member.role as string;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  return workspace?.ownerId === userId ? 'OWNER' : null;
}
