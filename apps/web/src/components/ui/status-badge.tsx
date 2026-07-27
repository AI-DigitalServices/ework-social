import { Clock, FileText, CheckCircle, AlertCircle, ClipboardCheck } from 'lucide-react';
import type { PostStatus } from '@/lib/types';
import { Badge, type BadgeTone } from './badge';

/**
 * The single source of truth for post-status appearance.
 * Replaces the duplicated status colour maps in the Scheduler and Dashboard.
 * Status is never conveyed by colour alone — every state has an icon + label
 * (WCAG 1.4.1 Use of Colour).
 */
const STATUS: Record<PostStatus, { tone: BadgeTone; label: string; icon: typeof Clock }> = {
  DRAFT: { tone: 'neutral', label: 'Draft', icon: FileText },
  SCHEDULED: { tone: 'info', label: 'Scheduled', icon: Clock },
  PUBLISHED: { tone: 'success', label: 'Published', icon: CheckCircle },
  FAILED: { tone: 'danger', label: 'Failed', icon: AlertCircle },
  PENDING_APPROVAL: { tone: 'brand', label: 'Pending approval', icon: ClipboardCheck },
};

export function StatusBadge({ status }: { status: PostStatus }) {
  const s = STATUS[status] ?? STATUS.DRAFT;
  const Icon = s.icon;
  return (
    <Badge tone={s.tone}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {s.label}
    </Badge>
  );
}
