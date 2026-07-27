import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Loading placeholder. Compose several to mirror the shape of the content
 * that's loading (see PostListSkeleton pattern). Decorative — hidden from
 * assistive tech; announce loading state at the container level instead.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-[var(--radius)] bg-surface-2', className)}
      style={{ animation: 'ews-pulse 1.5s ease-in-out infinite' }}
      {...props}
    />
  );
}
