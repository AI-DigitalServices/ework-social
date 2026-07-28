-- DB-backed admin role (replaces hardcoded email list)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Seed the existing known admins so nobody loses access on cutover
UPDATE "User" SET "isAdmin" = true
WHERE "email" IN (
  'admin@eworksocial.com',
  'eworksocial@gmail.com',
  'aiservices.agent@gmail.com',
  'info.oshapify@gmail.com'
);
