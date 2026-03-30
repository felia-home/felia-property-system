-- Add AI check and confirmation fields
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "last_confirmed_by" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "last_check_result" JSONB;
