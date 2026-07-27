'use client';

import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';

export interface DataStateProps {
  loading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  /** Shown while loading. Prefer a shape-matching skeleton over a spinner. */
  skeleton: ReactNode;
  /** Shown when there is no data. */
  empty?: ReactNode;
  /** Called when the user clicks retry on the error state. */
  onRetry?: () => void;
  children: ReactNode;
}

/**
 * Standardizes the loading → error → empty → data lifecycle that every list
 * screen otherwise re-implements by hand. Makes blank-screen-on-error and
 * infinite-spinner bugs structurally impossible.
 */
export function DataState({
  loading,
  error,
  isEmpty,
  skeleton,
  empty,
  onRetry,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-live="polite">
        {skeleton}
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          Something went wrong
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted">
          We couldn&apos;t load this right now. Check your connection and try again.
        </p>
        {onRetry && (
          <Button variant="secondary" className="mt-6" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty && empty) return <>{empty}</>;

  return <>{children}</>;
}
