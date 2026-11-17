import { ForbiddenException } from '@nestjs/common';

// Shared server-side role rules. The web app hides buttons from some roles; these
// helpers make the API itself refuse, so a direct API call cannot bypass the UI.

/** Owners, admins and editors can create and change content. */
export const WRITER_ROLES = ['OWNER', 'ADMIN', 'EDITOR'] as const;
/** Owners and admins manage the workspace itself (members, billing, settings, keys). */
export const MANAGER_ROLES = ['OWNER', 'ADMIN'] as const;

export function canWrite(role?: string | null): boolean {
  return !!role && (WRITER_ROLES as readonly string[]).includes(role);
}

export function canManage(role?: string | null): boolean {
  return !!role && (MANAGER_ROLES as readonly string[]).includes(role);
}

/**
 * Kill switch. Set WRITE_CHECKS=off on the server to disable the role and
 * read-only checks added with this helper (status checks stay). For use only if
 * an unexpected lock-out needs undoing quickly.
 */
export function writeChecksEnabled(): boolean {
  return (process.env.WRITE_CHECKS || '').trim().toLowerCase() !== 'off';
}

export function assertWriterRole(
  role?: string | null,
  message = 'Your role can view this workspace but not change it.',
): void {
  if (!canWrite(role)) throw new ForbiddenException(message);
}

export function assertManagerRole(
  role?: string | null,
  message = 'Only workspace owners and admins can do this.',
): void {
  if (!canManage(role)) throw new ForbiddenException(message);
}
