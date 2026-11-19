import { NotFoundException } from '@nestjs/common';
import { assertWriterRole, writeChecksEnabled } from './roles';
import { resolveWorkspaceRole } from './workspace-role.util';

/**
 * Write access for a route that acts on one record by id (no workspaceId in the
 * request). Looks the record up, takes ITS workspace, and checks the caller:
 *   - not a member  -> 404 (existence is not revealed)       [always on]
 *   - not a writer  -> 403                                    [WRITE_CHECKS]
 *   - read-only workspace (trial/subscription ended) -> 403   [WRITE_CHECKS]
 * Returns the record's workspaceId.
 */
export async function assertRecordWriteAccess(
  prisma: any,
  planGuard: { assertCanWrite(workspaceId: string): Promise<unknown> },
  opts: { model: string; id: string; userId: string; label?: string },
): Promise<string> {
  const label = opts.label || 'Record';
  const record = await prisma[opts.model].findUnique({
    where: { id: opts.id },
    select: { workspaceId: true },
  });
  if (!record) throw new NotFoundException(`${label} not found`);

  const role = await resolveWorkspaceRole(prisma, record.workspaceId, opts.userId);
  if (!role) throw new NotFoundException(`${label} not found`);

  if (writeChecksEnabled()) {
    assertWriterRole(role);
    await planGuard.assertCanWrite(record.workspaceId);
  }
  return record.workspaceId;
}
