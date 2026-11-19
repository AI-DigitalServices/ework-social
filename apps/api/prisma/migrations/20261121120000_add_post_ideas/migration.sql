-- PART A. Run this ALONE first (an enum value must be added before anything uses it).
ALTER TYPE "AiUsageType" ADD VALUE 'IDEA_POST';

-- PART B. Run after Part A has finished.
CREATE TABLE "PostIdea" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "platform" TEXT,
    "createdById" TEXT,
    "usedPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostIdea_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostIdea_workspaceId_usedPostId_createdAt_idx" ON "PostIdea"("workspaceId", "usedPostId", "createdAt");
