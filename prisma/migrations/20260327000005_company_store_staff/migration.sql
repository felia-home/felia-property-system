-- Migration: Company, Store, Staff, PropertyTransfer; property_number on Property

CREATE TABLE IF NOT EXISTS "companies" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "name"            TEXT NOT NULL,
  "name_kana"       TEXT,
  "license_number"  TEXT,
  "license_expiry"  TIMESTAMP(3),
  "postal_code"     TEXT,
  "address"         TEXT,
  "phone"           TEXT,
  "fax"             TEXT,
  "representative"  TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "stores" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "company_id"  TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "store_code"  TEXT NOT NULL,
  "postal_code" TEXT,
  "address"     TEXT,
  "phone"       TEXT,
  "is_active"   BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stores_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "stores_store_code_key" ON "stores"("store_code");

CREATE TABLE IF NOT EXISTS "staff" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "store_id"        TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "name_kana"       TEXT,
  "email"           TEXT,
  "phone"           TEXT,
  "role"            TEXT NOT NULL DEFAULT 'agent',
  "license_number"  TEXT,
  "is_retired"      BOOLEAN NOT NULL DEFAULT FALSE,
  "retired_at"      TIMESTAMP(3),
  "successor_id"    TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "property_transfers" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "property_id"   TEXT NOT NULL,
  "from_staff_id" TEXT NOT NULL,
  "to_staff_id"   TEXT NOT NULL,
  "reason"        TEXT NOT NULL DEFAULT 'retirement',
  "note"          TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_transfers_from_staff_id_fkey" FOREIGN KEY ("from_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_transfers_to_staff_id_fkey"   FOREIGN KEY ("to_staff_id")   REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "property_number" TEXT;
