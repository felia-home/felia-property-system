-- Migration: Replace staff table with expanded staffs table
-- Old fields mapped:  email→email_work, phone→tel_work, role→permission,
--                     license_number→takken_number, is_retired→is_active (inverted),
--                     retired_at→retirement_date

-- ── Step 1: Create new staffs table ──────────────────────────────────────────

CREATE TABLE "staffs" (
  "id"                  TEXT NOT NULL,
  "company_id"          TEXT,
  "store_id"            TEXT,
  "permission"          TEXT NOT NULL DEFAULT 'AGENT',
  "employee_number"     TEXT,
  "name"                TEXT NOT NULL,
  "name_kana"           TEXT,
  "name_en"             TEXT,
  "nickname"            TEXT,
  "position"            TEXT,
  "qualifications"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "takken_number"       TEXT,
  "takken_prefecture"   TEXT,
  "takken_expires_at"   TIMESTAMP(3),
  "email_work"          TEXT,
  "tel_work"            TEXT,
  "tel_mobile"          TEXT,
  "extension"           TEXT,
  "email_personal"      TEXT,
  "tel_personal"        TEXT,
  "postal_code"         TEXT,
  "prefecture"          TEXT,
  "city"                TEXT,
  "address"             TEXT,
  "birth_date"          TIMESTAMP(3),
  "gender"              TEXT,
  "blood_type"          TEXT,
  "emergency_contact"   TEXT,
  "emergency_tel"       TEXT,
  "emergency_relation"  TEXT,
  "employment_type"     TEXT,
  "hire_date"           TIMESTAMP(3),
  "trial_end_date"      TIMESTAMP(3),
  "department"          TEXT,
  "annual_salary"       INTEGER,
  "specialty_areas"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "specialty_types"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "monthly_target"      INTEGER,
  "career_history"      TEXT,
  "photo_url"           TEXT,
  "bio"                 TEXT,
  "catchphrase"         TEXT,
  "published_hp"        BOOLEAN NOT NULL DEFAULT FALSE,
  "hp_order"            INTEGER NOT NULL DEFAULT 0,
  "is_active"           BOOLEAN NOT NULL DEFAULT TRUE,
  "retirement_date"     TIMESTAMP(3),
  "retirement_reason"   TEXT,
  "successor_id"        TEXT,
  "last_login_at"       TIMESTAMP(3),
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "staffs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staffs_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "staffs_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "staffs_employee_number_key" ON "staffs"("employee_number");
CREATE UNIQUE INDEX "staffs_email_work_key"       ON "staffs"("email_work");

-- ── Step 2: Migrate existing staff rows ──────────────────────────────────────

INSERT INTO "staffs" (
  "id", "store_id", "name", "name_kana",
  "email_work", "tel_work",
  "permission", "takken_number",
  "is_active", "retirement_date", "successor_id",
  "created_at", "updated_at"
)
SELECT
  "id",
  "store_id",
  "name",
  "name_kana",
  "email",
  "phone",
  CASE
    WHEN "role" = 'admin'   THEN 'ADMIN'
    WHEN "role" = 'manager' THEN 'MANAGER'
    ELSE 'AGENT'
  END,
  "license_number",
  NOT "is_retired",
  "retired_at",
  "successor_id",
  "created_at",
  "updated_at"
FROM "staff";

-- ── Step 3: Re-wire property_transfers FKs to staffs ─────────────────────────

ALTER TABLE "property_transfers"
  DROP CONSTRAINT IF EXISTS "property_transfers_from_staff_id_fkey",
  DROP CONSTRAINT IF EXISTS "property_transfers_to_staff_id_fkey";

ALTER TABLE "property_transfers"
  ADD CONSTRAINT "property_transfers_from_staff_id_fkey"
    FOREIGN KEY ("from_staff_id") REFERENCES "staffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "property_transfers_to_staff_id_fkey"
    FOREIGN KEY ("to_staff_id")   REFERENCES "staffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Step 4: Drop old staff table ─────────────────────────────────────────────

DROP TABLE "staff";

-- ── Step 5: Add successor_agent_id to properties ─────────────────────────────

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "successor_agent_id" TEXT;
