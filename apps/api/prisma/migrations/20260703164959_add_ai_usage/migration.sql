-- CreateEnum
CREATE TYPE "AiUsageType" AS ENUM ('CAPTION', 'HASHTAG', 'REWRITE', 'CRM_INSIGHT', 'REPLY_SUGGEST');

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "AiUsageType" NOT NULL,
    "month" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsage_workspaceId_month_idx" ON "AiUsage"("workspaceId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_workspaceId_type_month_key" ON "AiUsage"("workspaceId", "type", "month");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
