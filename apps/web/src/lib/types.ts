/**
 * Shared domain types mirroring the API responses.
 *
 * These replace the `any`-typed props scattered across feature components
 * (e.g. `post: any`, `accounts: any[]`). Import from here so the compiler and
 * editor understand your data. Extend as the API grows.
 */

export type Platform =
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'LINKEDIN'
  | 'TWITTER'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'THREADS'
  | 'BLUESKY';

export type PostStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'PENDING_APPROVAL';

export type ClientStage =
  | 'LEAD'
  | 'CONTACTED'
  | 'PROPOSAL'
  | 'ACTIVE'
  | 'DORMANT';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface SocialAccount {
  id: string;
  workspaceId: string;
  platform: Platform;
  accountName: string;
  accountId: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Client {
  id: string;
  workspaceId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  tags: string[];
  stage: ClientStage;
  source?: string | null;
  dealValue?: number | null;
  assignedToId?: string | null;
  nextFollowUpAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  workspaceId: string;
  socialAccountId?: string | null;
  socialAccount?: Pick<SocialAccount, 'platform' | 'accountName'> | null;
  content: string;
  mediaUrls: string[];
  status: PostStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  clientId?: string | null;
  createdAt?: string;
}

export interface InboxMessage {
  id: string;
  workspaceId: string;
  platform: Platform;
  type: 'DM' | 'COMMENT' | 'MENTION';
  authorName: string;
  content: string;
  isRead: boolean;
  isResolved: boolean;
  tags: string[];
  clientId?: string | null;
  assignedToId?: string | null;
  createdAt: string;
}
