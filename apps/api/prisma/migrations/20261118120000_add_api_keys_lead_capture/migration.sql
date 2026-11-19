-- Integrations step 2: workspace API keys + website lead-capture links.
-- Additive and idempotent (IF NOT EXISTS), so it is safe to run twice.
-- Run on STAGING Neon first, then production, before deploying the code.

CREATE TABLE IF NOT EXISTS "ApiKey" (
  id text PRIMARY KEY,
  "workspaceId" text NOT NULL REFERENCES "Workspace"(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL,
  "keyHash" text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  "createdById" text,
  "lastUsedAt" timestamp(3),
  "expiresAt" timestamp(3),
  "revokedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "ApiKey_workspaceId_idx" ON "ApiKey"("workspaceId");

CREATE TABLE IF NOT EXISTS "LeadCaptureLink" (
  id text PRIMARY KEY,
  "workspaceId" text NOT NULL REFERENCES "Workspace"(id) ON DELETE CASCADE,
  name text NOT NULL,
  token text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  "defaultTags" text[] NOT NULL DEFAULT '{}',
  "redirectUrl" text,
  "lastUsedAt" timestamp(3),
  "submissionCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeadCaptureLink_token_key" ON "LeadCaptureLink"(token);
CREATE INDEX IF NOT EXISTS "LeadCaptureLink_workspaceId_idx" ON "LeadCaptureLink"("workspaceId");
