-- CreateEnum
CREATE TYPE "InboxMessageType" AS ENUM ('DM', 'COMMENT');

-- CreateTable
CREATE TABLE "InboxMessage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "type" "InboxMessageType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT,
    "senderAvatar" TEXT,
    "content" TEXT NOT NULL,
    "postId" TEXT,
    "postContent" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "assignedToId" TEXT,
    "aiSuggestion" TEXT,
    "socialAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxReply" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" TEXT,
    "isAuto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InboxReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxMessage_workspaceId_isResolved_createdAt_idx" ON "InboxMessage"("workspaceId", "isResolved", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InboxMessage_platform_externalId_key" ON "InboxMessage"("platform", "externalId");

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxReply" ADD CONSTRAINT "InboxReply_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "InboxMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
