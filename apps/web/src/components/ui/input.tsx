import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-10 w-full rounded-[var(--radius)] border bg-background px-3 text-sm text-foreground',
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
Input.displayName = 'Input';
