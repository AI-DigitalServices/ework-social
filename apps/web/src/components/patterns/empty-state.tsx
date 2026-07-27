import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { buttonClassName } from '@/components/ui/button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Primary call-to-action. Provide either `href` (link) or `onClick`. */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

/**
 * The one component for every "nothing here yet" moment. An invitation, not an
 * apology: the headline names the space, one line explains it, the CTA is a verb.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link href={action.href} className={buttonClassName()}>
              {action.label}
            </Link>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  );
}
