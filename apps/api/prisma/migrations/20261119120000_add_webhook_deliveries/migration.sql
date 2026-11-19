-- Webhook delivery log + retry queue. Safe to run twice.
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
    "id"          TEXT         NOT NULL,
    "webhookId"   TEXT         NOT NULL,
    "workspaceId" TEXT         NOT NULL,
    "event"       TEXT         NOT NULL,
    "body"        TEXT         NOT NULL,
    "status"      INTEGER      NOT NULL DEFAULT 0,
    "state"       TEXT         NOT NULL,
    "attempts"    INTEGER      NOT NULL DEFAULT 1,
    "error"       TEXT,
    "durationMs"  INTEGER      NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookId_createdAt_idx" ON "WebhookDelivery"("webhookId", "createdAt");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_state_nextRetryAt_idx" ON "WebhookDelivery"("state", "nextRetryAt");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebhookDelivery_webhookId_fkey') THEN
    ALTER TABLE "WebhookDelivery"
      ADD CONSTRAINT "WebhookDelivery_webhookId_fkey"
      FOREIGN KEY ("webhookId") REFERENCES "WorkspaceWebhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Check
SELECT column_name FROM information_schema.columns WHERE table_name = 'WebhookDelivery' ORDER BY ordinal_position;
