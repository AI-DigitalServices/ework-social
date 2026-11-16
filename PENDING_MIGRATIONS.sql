-- ============================================================================
-- eWork Social — pending Neon migrations (run when you have DB access)
-- Safe to re-run: every statement is IF NOT EXISTS / additive.
-- Run in the Neon SQL editor. NOTE: run the ALTER TYPE line (section 3) on its
-- OWN — Postgres won't allow "ALTER TYPE ... ADD VALUE" inside a transaction
-- with other statements.
-- ============================================================================

-- 1) Semantic Brand Brain memory (pgvector) --------------------------------
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "WorkspaceMemory" ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE "WorkspaceMemory" ADD COLUMN IF NOT EXISTS "embeddingModel" text;
-- If the hnsw line errors (older pgvector), skip it — queries still work.
CREATE INDEX IF NOT EXISTS workspacememory_embedding_idx
  ON "WorkspaceMemory" USING hnsw (embedding vector_cosine_ops);

-- 2) BYOK — per-workspace encrypted AI key ---------------------------------
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "embeddingProvider" text;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "embeddingApiKeyEnc" text;

-- 3) AI image-generation usage type  (RUN THIS LINE ON ITS OWN) ------------
ALTER TYPE "AiUsageType" ADD VALUE IF NOT EXISTS 'IMAGE_GEN';

-- 4) Outbound webhooks ------------------------------------------------------
CREATE TABLE IF NOT EXISTS "WorkspaceWebhook" (
  id text PRIMARY KEY,
  "workspaceId" text NOT NULL REFERENCES "Workspace"(id),
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  "lastStatus" integer,
  "lastFiredAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "WorkspaceWebhook_workspaceId_idx" ON "WorkspaceWebhook"("workspaceId");

-- 5) Autopilot (scheduled agent auto-runs) ---------------------------------
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "autoRunEnabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "autoRunCadence" text;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "lastAutoRunAt" timestamp(3);

-- 6) Enterprise leads (pricing-page "Talk to sales" form) ------------------
CREATE TABLE IF NOT EXISTS "EnterpriseLead" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  message text,
  interest text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EnterpriseLead_createdAt_idx" ON "EnterpriseLead"("createdAt");

-- ============================================================================
-- After running: image generation, webhooks, Autopilot, semantic memory,
-- BYOK, and Enterprise lead capture all become fully active. Until then the
-- app degrades gracefully (those features no-op / fall back, nothing crashes).
-- ============================================================================
