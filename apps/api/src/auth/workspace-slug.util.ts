import { randomBytes } from 'crypto';

/** Same recipe sign-up has always used, so existing workspace addresses never change. */
export function slugBase(name: string): string {
  const base = String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60);
  return base || 'workspace';
}

/**
 * A workspace address that is free right now. The plain one when available; otherwise the same
 * address plus a short random suffix. Two businesses with the same name must never make
 * sign-up fail.
 */
export async function uniqueWorkspaceSlug(
  prisma: { workspace: { findUnique: (args: any) => Promise<unknown> } },
  name: string,
): Promise<string> {
  const base = slugBase(name);
  let slug = base;
  for (let i = 0; i < 6; i++) {
    const taken = await prisma.workspace.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
    slug = `${base}-${randomBytes(3).toString('hex')}`;
  }
  return `${base}-${Date.now()}`;
}
