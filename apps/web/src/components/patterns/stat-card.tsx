import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Optional destination — turns the whole card into a link. */
  href?: string;
  /** Optional trend hint, e.g. "+12% this week". */
  hint?: string;
}

/** Dashboard/analytics metric card. Tokenized so both screens share one look. */
export function StatCard({ label, value, icon: Icon, href, hint }: StatCardProps) {
  const inner = (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-background p-5',
        href && 'transition-colors hover:border-brand',
      )}
    >
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-info-bg text-brand">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
