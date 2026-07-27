'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Hide the default close (X) button, e.g. for a forced choice. */
  hideClose?: boolean;
  /**
   * Render only the accessible shell (focus trap, Esc, backdrop, aria-label
   * from `title`) with no default header/padding — for rich custom modals that
   * supply their own layout. `title` is still used as the accessible name.
   */
  bare?: boolean;
  className?: string;
}

/**
 * Accessible modal built on the native <dialog> element, which provides a
 * focus trap, Esc-to-close, backdrop, and focus return for free (WCAG 2.4.3,
 * 2.1.2). No third-party dependency required.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  hideClose,
  bare,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (bare) {
    return (
      <dialog
        ref={ref}
        aria-label={title}
        onClose={() => onOpenChange(false)}
        onClick={(e) => {
          if (e.target === ref.current) onOpenChange(false);
        }}
        className={cn(
          'm-auto w-full max-w-lg rounded-[var(--radius-card)] bg-transparent p-0',
          'backdrop:bg-black/60',
          className,
        )}
      >
        {children}
      </dialog>
    );
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-desc' : undefined}
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        // Close when the backdrop (the dialog element itself) is clicked
        if (e.target === ref.current) onOpenChange(false);
      }}
      className={cn(
        'm-auto w-full max-w-lg rounded-[var(--radius-card)] border border-border bg-background p-0 text-foreground',
        'backdrop:bg-black/50',
        className,
      )}
    >
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id="dialog-desc" className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {!hideClose && (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close dialog"
              className="rounded-[var(--radius-sm)] p-1 text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
        {footer && (
          <div className="mt-6 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
