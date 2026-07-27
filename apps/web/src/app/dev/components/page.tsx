'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { CalendarDays, Trash2, Plus } from 'lucide-react';
import {
  Button,
  Badge,
  StatusBadge,
  Card,
  Input,
  Textarea,
  Skeleton,
  Spinner,
  Dialog,
} from '@/components/ui';
import {
  EmptyState,
  DataState,
  PageHeader,
  StatCard,
  FormField,
  ConfirmDialog,
} from '@/components/patterns';
import type { PostStatus } from '@/lib/types';

/**
 * Dev-only component gallery. Living documentation + a manual visual check of
 * every primitive and pattern in its states. Not part of the product; blocked
 * outside development.
 */
export default function ComponentGallery() {
  if (process.env.NODE_ENV === 'production') notFound();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const statuses: PostStatus[] = [
    'DRAFT',
    'SCHEDULED',
    'PUBLISHED',
    'FAILED',
    'PENDING_APPROVAL',
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-12 p-8">
      <PageHeader
        title="Component gallery"
        description="Every primitive and pattern, in every state. Dev-only."
      />

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Add">
            <Plus className="h-5 w-5" />
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />}>With icon</Button>
        </div>
      </Section>

      <Section title="Badges & status">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="brand">Brand</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="info">Info</Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {statuses.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <Card.Header>
            <Card.Title>Card title</Card.Title>
            <Card.Description>A short supporting description.</Card.Description>
          </Card.Header>
          <Card.Body>
            <p className="text-sm text-muted">Body content goes here.</p>
          </Card.Body>
          <Card.Footer>
            <Button size="sm">Action</Button>
            <Button size="sm" variant="ghost">
              Cancel
            </Button>
          </Card.Footer>
        </Card>
      </Section>

      <Section title="Inputs & form field">
        <div className="max-w-sm space-y-4">
          <Input placeholder="name@company.com" />
          <Input invalid placeholder="Invalid input" />
          <Textarea placeholder="Write a caption…" />
          <FormField
            label="Email"
            required
            hint="We'll never share it."
          >
            {(a) => <Input placeholder="name@company.com" {...a} />}
          </FormField>
          <FormField label="Handle" error="That handle is already taken.">
            {(a) => <Input defaultValue="taken" {...a} />}
          </FormField>
        </div>
      </Section>

      <Section title="Loading">
        <div className="flex items-center gap-6">
          <Spinner />
          <div className="w-full max-w-sm space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </Section>

      <Section title="Stat cards">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Scheduled posts" value={12} icon={CalendarDays} hint="+3 this week" />
          <StatCard label="Published" value={1284} icon={CalendarDays} href="/dev/components" />
        </div>
      </Section>

      <Section title="Empty & data states">
        <div className="rounded-[var(--radius-card)] border border-border">
          <EmptyState
            icon={CalendarDays}
            title="No scheduled posts yet"
            description="Create your first post and pick a time — we'll publish it for you."
            action={{ label: 'Schedule a post', href: '/dev/components' }}
          />
        </div>
        <div className="mt-4 rounded-[var(--radius-card)] border border-border">
          <DataState loading={false} error={new Error('demo')} skeleton={null} onRetry={() => {}}>
            <div />
          </DataState>
        </div>
      </Section>

      <Section title="Dialogs">
        <div className="flex gap-3">
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmOpen(true)}>
            Delete something
          </Button>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Example dialog"
          description="Built on the native <dialog> element — focus trap, Esc, and backdrop for free."
          footer={<Button onClick={() => setDialogOpen(false)}>Got it</Button>}
        >
          <p className="text-sm text-muted">Dialog body content.</p>
        </Dialog>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete this post?"
          description="This can't be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={() => setConfirmOpen(false)}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 border-b border-border pb-2 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
