// Single source of truth for the outbound events a workspace can subscribe to.
// Keep in sync with the dispatch() calls across the app. The catalog powers the
// Integrations settings screen ("?" help), the docs, and the Make/n8n/Zapier
// templates, so every event needs a plain-language label and description.

export const WEBHOOK_EVENTS = [
  'post.published',
  'post.failed',
  'lead.created',
  'inbox.message',
  'client.updated',
  'client.stage_changed',
  'client.deleted',
  'note.added',
  'task.created',
  'task.completed',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookEventInfo {
  id: WebhookEvent;
  label: string;
  group: 'Publishing' | 'CRM' | 'Inbox';
  description: string;
}

export const WEBHOOK_EVENT_CATALOG: WebhookEventInfo[] = [
  {
    id: 'post.published',
    label: 'Post published',
    group: 'Publishing',
    description: 'A scheduled or instant post went live on a connected social account.',
  },
  {
    id: 'post.failed',
    label: 'Post failed',
    group: 'Publishing',
    description: 'A post could not be published. Use it to alert your team in Slack or email.',
  },
  {
    id: 'lead.created',
    label: 'New contact (CRM)',
    group: 'CRM',
    description: 'A new contact or lead was added to your CRM, manually or from a form.',
  },
  {
    id: 'client.updated',
    label: 'Client updated',
    group: 'CRM',
    description: 'A contact\'s details changed (name, email, deal value, assignee, tags, follow-up date). The payload lists which fields changed.',
  },
  {
    id: 'client.stage_changed',
    label: 'Pipeline stage changed',
    group: 'CRM',
    description: 'A contact moved to a different pipeline stage. Includes the previous and new stage.',
  },
  {
    id: 'client.deleted',
    label: 'Client deleted',
    group: 'CRM',
    description: 'A contact was deleted from your CRM.',
  },
  {
    id: 'note.added',
    label: 'Note added',
    group: 'CRM',
    description: 'A note was added to a contact.',
  },
  {
    id: 'task.created',
    label: 'Task created',
    group: 'CRM',
    description: 'A follow-up task was created for a contact.',
  },
  {
    id: 'task.completed',
    label: 'Task completed',
    group: 'CRM',
    description: 'A task on a contact was marked done.',
  },
  {
    id: 'inbox.message',
    label: 'New inbox message',
    group: 'Inbox',
    description: 'A new comment or direct message arrived in the Engagement Hub.',
  },
];
