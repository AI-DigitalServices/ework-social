-- Add tags array and CRM client link to InboxMessage
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "crmClientId" TEXT;

-- Foreign key to Client (nullable — set null on client delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InboxMessage_crmClientId_fkey'
  ) THEN
    ALTER TABLE "InboxMessage"
      ADD CONSTRAINT "InboxMessage_crmClientId_fkey"
      FOREIGN KEY ("crmClientId") REFERENCES "Client"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Index for CRM link lookups
CREATE INDEX IF NOT EXISTS "InboxMessage_crmClientId_idx" ON "InboxMessage"("crmClientId");
