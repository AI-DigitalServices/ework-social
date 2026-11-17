// Pure helper for payment verification. No framework imports.

/**
 * A Paystack payment may only upgrade the workspace it was started for.
 * Checkout stamps { workspaceId } into the transaction metadata; verification
 * must find the same id there. Metadata may come back as an object or as a JSON
 * string; anything else (missing, malformed, different workspace) is refused.
 */
export function paymentBelongsToWorkspace(metadata: unknown, workspaceId: string): boolean {
  if (!workspaceId) return false;
  let meta: any = metadata;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      return false;
    }
  }
  return !!meta && typeof meta === 'object' && meta.workspaceId === workspaceId;
}
