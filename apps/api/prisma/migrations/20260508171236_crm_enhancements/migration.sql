-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MANUAL', 'INSTAGRAM_DM', 'INSTAGRAM_COMMENT', 'FACEBOOK_DM', 'FACEBOOK_COMMENT', 'REFERRAL', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE_ADDED', 'STAGE_CHANGED', 'DM_RECEIVED', 'COMMENT_RECEIVED', 'TASK_CREATED', 'TASK_COMPLETED', 'EMAIL_SENT', 'DEAL_UPDATED', 'ASSIGNED', 'CREATED');

-- AlterTable: Add new CRM fields to Client
ALTER TABLE "Client"
  ADD COLUMN "company"          TEXT,
  ADD COLUMN "source"           "LeadSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "dealValue"        DOUBLE PRECISION,
  ADD COLUMN "lastContactedAt"  TIMESTAMP(3),
  ADD COLUMN "nextFollowUpAt"   TIMESTAMP(3),
  ADD COLUMN "assignedToId"     TEXT,
  ADD COLUMN "socialProfiles"   JSONB;

-- AddForeignKey: Client.assignedTo -> User
ALTER TABLE "Client"
  ADD CONSTRAINT "Client_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: Activity
CREATE TABLE "Activity" (
  "id"          TEXT NOT NULL,
  "clientId"    TEXT NOT NULL,
  "userId"      TEXT,
  "type"        "ActivityType" NOT NULL,
  "description" TEXT NOT NULL,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: Activity.client
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Activity.user
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
