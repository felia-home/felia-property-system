-- ============================================================
-- Migration: photo_management
-- PropertyImage, MansionBuilding, MansionExteriorImage, PropertyEnvironmentImage
-- Safe: uses IF NOT EXISTS
-- ============================================================

-- ----------------------------------------------------------------
-- 1. property_images
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "property_images" (
    "id"              TEXT NOT NULL,
    "property_id"     TEXT NOT NULL,
    "url"             TEXT NOT NULL,
    "filename"        TEXT NOT NULL,
    "file_size"       INTEGER,
    "mime_type"       TEXT,
    "order"           INTEGER NOT NULL DEFAULT 0,
    "room_type"       TEXT,
    "caption"         TEXT,
    "ai_caption"      TEXT,
    "ai_pr_text"      TEXT,
    "ai_confidence"   DOUBLE PRECISION,
    "ai_analyzed_at"  TIMESTAMP(3),
    "is_main"         BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by"     TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "property_images_property_id_idx" ON "property_images"("property_id");

-- ----------------------------------------------------------------
-- 2. mansion_buildings
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "mansion_buildings" (
    "id"                 TEXT NOT NULL,
    "name"               TEXT NOT NULL,
    "name_kana"          TEXT,
    "prefecture"         TEXT,
    "city"               TEXT,
    "address"            TEXT,
    "total_units"        INTEGER,
    "built_year"         INTEGER,
    "built_month"        INTEGER,
    "structure"          TEXT,
    "floors_total"       INTEGER,
    "floors_basement"    INTEGER,
    "management_company" TEXT,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mansion_buildings_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------
-- 3. mansion_exterior_images
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "mansion_exterior_images" (
    "id"         TEXT NOT NULL,
    "mansion_id" TEXT NOT NULL,
    "url"        TEXT NOT NULL,
    "filename"   TEXT NOT NULL,
    "caption"    TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mansion_exterior_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mansion_exterior_images_mansion_id_idx" ON "mansion_exterior_images"("mansion_id");

-- ----------------------------------------------------------------
-- 4. property_environment_images
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "property_environment_images" (
    "id"            TEXT NOT NULL,
    "url"           TEXT NOT NULL,
    "filename"      TEXT NOT NULL,
    "facility_type" TEXT NOT NULL,
    "facility_name" TEXT,
    "prefecture"    TEXT,
    "city"          TEXT,
    "address"       TEXT,
    "latitude"      DOUBLE PRECISION,
    "longitude"     DOUBLE PRECISION,
    "caption"       TEXT,
    "ai_caption"    TEXT,
    "uploaded_by"   TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_environment_images_pkey" PRIMARY KEY ("id")
);
