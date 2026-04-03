-- Add selling_points array field to properties
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "selling_points" TEXT[] NOT NULL DEFAULT '{}';
