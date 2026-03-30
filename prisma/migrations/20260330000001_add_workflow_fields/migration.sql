-- AlterTable: add workflow, photo stats, and task management fields to properties
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "ad_confirmation_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ad_confirmation_method" TEXT,
  ADD COLUMN IF NOT EXISTS "ad_confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ad_confirmed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "ad_confirmation_file" TEXT,
  ADD COLUMN IF NOT EXISTS "photo_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "photo_has_exterior" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "photo_has_floor_plan" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "photo_has_interior" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "photo_last_updated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "days_on_market" INTEGER,
  ADD COLUMN IF NOT EXISTS "inquiry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pending_tasks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
