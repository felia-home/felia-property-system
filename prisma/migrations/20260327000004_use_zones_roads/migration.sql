-- Migration: add use_zones (multi use-zone JSON) and roads (multi road JSON)
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "use_zones" JSONB;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "roads"     JSONB;
