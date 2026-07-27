import { cn } from '@/lib/utils';

export interface SpinnerProps {
  className?: string;
  /** Accessible label announced to screen readers. Defaults to "Loading". */
  label?: string;
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className="inline-flex">
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-5 w-5 rounded-full border-2 border-current border-t-transparent text-brand',
          className,
        )}
        style={{ animation: 'ews-spin 0.6s linear infinite' }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
