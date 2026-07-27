import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'min-h-[80px] w-full rounded-[var(--radius)] border bg-background px-3 py-2 text-sm text-foreground',
          'placeholder:text-subtle',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          invalid ? 'border-danger' : 'border-input',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
