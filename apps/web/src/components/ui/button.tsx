'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-foreground hover:bg-brand-emphasis focus-visible:ring-ring',
  secondary:
    'bg-surface-2 text-foreground hover:bg-border focus-visible:ring-ring',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-surface-2 focus-visible:ring-ring',
  ghost:
    'bg-transparent text-foreground hover:bg-surface-2 focus-visible:ring-ring',
  danger:
    'bg-danger text-white hover:opacity-90 focus-visible:ring-danger',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
};

const BASE =
  'inline-flex items-center rounded-[var(--radius)] font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

/**
 * Returns the button's class string. Use this to style a Next <Link> or <a> as
 * a button without nesting a <button> inside a link (invalid HTML).
 *   <Link className={buttonClassName()}>Go</Link>
 */
export function buttonClassName(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  const { variant = 'primary', size = 'md', className } = opts ?? {};
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/**
 * The single button primitive for the whole app.
 * - `isLoading` shows a spinner and disables the button (prevents double-submit)
 * - always keyboard-focusable with a visible focus ring (WCAG 2.4.7)
 * - icon-only buttons (`size="icon"`) MUST be given an `aria-label`
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
        {...props}
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
            style={{ animation: 'ews-spin 0.6s linear infinite' }}
          />
        )}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  },
);
Button.displayName = 'Button';
