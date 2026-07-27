# eWork Social — Component Library (Phase 1)

The shared UI foundation. Import primitives from `@/components/ui` and patterns
from `@/components/patterns`. Never write raw hex colors or pixel spacing in
feature components — use the token-backed Tailwind utilities (`bg-surface`,
`text-muted`, `bg-brand`, `rounded-[var(--radius-card)]`, …).

Preview everything live at **`/dev/components`** (dev only).

## Design tokens

Defined once in `src/app/globals.css`. Use the Tailwind utilities they generate:

| Purpose | Utility | Token |
|---------|---------|-------|
| Primary brand | `bg-brand` `text-brand` | `--brand` |
| Page background | `bg-background` | `--background` |
| Card / raised surface | `bg-surface` `bg-surface-2` | `--surface` |
| Hairline border | `border-border` | `--border` |
| Primary text | `text-foreground` | `--foreground` |
| Secondary text | `text-muted` | `--muted` |
| Hint / placeholder | `text-subtle` | `--subtle` |
| Success / Warning / Danger / Info | `text-success` `bg-success-bg` … | `--success` … |
| Focus ring | `ring-ring` | `--ring` |

Dark mode is stubbed under `.dark` — filling it in is the only work needed later.

## Primitives (`@/components/ui`)

- **Button** — `variant` (primary·secondary·outline·ghost·danger), `size` (sm·md·lg·icon), `isLoading`, `leftIcon`/`rightIcon`. Icon-only buttons require `aria-label`. For links styled as buttons use `buttonClassName()` on a `<Link>`.
- **Badge** — `tone` (neutral·brand·success·warning·danger·info).
- **StatusBadge** — `status` (post status). One source of truth for status colors; always icon + label.
- **Card** — compound: `Card.Header` `Card.Title` `Card.Description` `Card.Body` `Card.Footer`.
- **Input / Textarea** — `invalid` prop sets the error border + `aria-invalid`.
- **Label** — `required` adds the asterisk.
- **Skeleton** — shape-matching loading placeholder.
- **Spinner** — accessible busy indicator (`label` prop).
- **Dialog** — accessible modal on native `<dialog>` (focus trap, Esc, backdrop free). `open` / `onOpenChange` / `title` / `description` / `footer`.

## Patterns (`@/components/patterns`)

- **PageHeader** — `title`, `description`, `actions`. Top of every route.
- **StatCard** — `label`, `value`, `icon`, optional `href`, `hint`.
- **EmptyState** — `icon`, `title`, `description`, `action` ({label, href|onClick}).
- **DataState** — wraps `loading`/`error`/`isEmpty`/data with `skeleton`, `empty`, `onRetry`. Use on every list screen.
- **FormField** — `label`, `required`, `hint`, `error` + render-prop wiring label/error to the input for a11y.
- **ConfirmDialog** — destructive-action confirmation. `destructive`, `isLoading`, `onConfirm`.

## Conventions

- One component per file; primitives use named exports.
- `className` is always forwarded and merged with `cn()` — overrides just work.
- Type props against `@/lib/types` (`Post`, `Client`, `SocialAccount`, `InboxMessage`) — no `any`.
- Compose primitives; feature components carry data + logic, never raw styling.

## Example

```tsx
import { PageHeader, DataState, EmptyState } from '@/components/patterns';
import { Button } from '@/components/ui';
import { CalendarDays } from 'lucide-react';

<PageHeader title="Scheduler" description="Plan and publish your content"
  actions={<Button leftIcon={<CalendarDays className="h-4 w-4" />}>New post</Button>} />

<DataState
  loading={isLoading} error={error} isEmpty={posts.length === 0}
  skeleton={<PostListSkeleton />}
  empty={<EmptyState icon={CalendarDays} title="No posts yet"
    description="Create your first post." action={{ label: 'New post', onClick: openComposer }} />}
>
  {posts.map((p) => <PostCard key={p.id} post={p} />)}
</DataState>
```
