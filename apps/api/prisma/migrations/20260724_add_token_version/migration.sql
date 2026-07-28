-- Add tokenVersion for revocable refresh tokens (logout-everywhere / revoke on password change)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
