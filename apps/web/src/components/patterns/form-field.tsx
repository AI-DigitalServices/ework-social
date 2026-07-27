'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  /** Helper text shown below the field. */
  hint?: string;
  /** Error message — when present, the field is marked invalid for a11y. */
  error?: string;
  /**
   * Render-prop receiving the id + aria attributes to spread onto your input,
   * so label/hint/error are correctly associated (WCAG 1.3.1, 3.3.2).
   */
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }) => ReactNode;
}

export function FormField({ label, required, hint, error, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {error ? (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
