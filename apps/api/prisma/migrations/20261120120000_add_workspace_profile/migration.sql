-- Onboarding profile + a metering type for the AI website scan.
-- RUN IN TWO STEPS in the Neon SQL editor: first PART A alone, then PART B.
-- (A new enum value cannot be used in the same transaction that adds it.)

-- ===== PART A: run this alone first =====
ALTER TYPE "AiUsageType" ADD VALUE IF NOT EXISTS 'ONBOARDING_AI';

-- ===== PART B: run after Part A succeeded =====
CREATE TABLE IF NOT EXISTS "WorkspaceProfile" (
    "id"                    TEXT         NOT NULL,
    "workspaceId"           TEXT         NOT NULL,
    "category"              TEXT,
    "website"               TEXT,
    "description"           TEXT,
    "audience"              TEXT,
    "offerings"             TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "tone"                  TEXT,
    "brandColors"           TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "language"              TEXT,
    "country"               TEXT,
    "postingFrequency"      TEXT,
    "platforms"             TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "contentTypes"          TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "onboardingStep"        INTEGER      NOT NULL DEFAULT 0,
    "onboardingCompletedAt" TIMESTAMP(3),
    "websiteAnalyzedAt"     TIMESTAMP(3),
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceProfile_workspaceId_key" ON "WorkspaceProfile"("workspaceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceProfile_workspaceId_fkey') THEN
    ALTER TABLE "WorkspaceProfile"
      ADD CONSTRAINT "WorkspaceProfile_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Check
SELECT column_name FROM information_schema.columns WHERE table_name = 'WorkspaceProfile' ORDER BY ordinal_position;
SELECT unnest(enum_range(NULL::"AiUsageType")) AS usage_types;
