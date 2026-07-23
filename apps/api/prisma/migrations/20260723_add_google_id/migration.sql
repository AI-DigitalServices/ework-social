-- Add googleId to User for Google OAuth sign-in
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

-- Unique constraint (only if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_googleId_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_googleId_key" UNIQUE ("googleId");
  END IF;
END $$;
