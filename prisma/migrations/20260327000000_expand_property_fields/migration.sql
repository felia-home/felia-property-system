-- ============================================================
-- Migration: create_all_missing_tables
-- Safe to run on any state: uses IF NOT EXISTS / IF EXISTS
-- ============================================================

-- ----------------------------------------------------------------
-- 1. properties テーブル（新規作成 or 既存に列追加）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "properties" (
    "id"                    TEXT NOT NULL,
    "legacy_id"             TEXT,
    "property_type"         TEXT NOT NULL,
    "transaction_type"      TEXT NOT NULL DEFAULT '仲介',
    "brokerage_type"        TEXT NOT NULL DEFAULT '専任',
    "status"                TEXT NOT NULL DEFAULT 'DRAFT',
    "title"                 TEXT,
    "catch_copy"            TEXT,
    "description_hp"        TEXT,
    "description_portal"    TEXT,
    "description_suumo"     TEXT,
    "description_athome"    TEXT,
    "prefecture"            TEXT NOT NULL DEFAULT '東京都',
    "city"                  TEXT NOT NULL DEFAULT '',
    "address"               TEXT NOT NULL DEFAULT '',
    "address_chiban"        TEXT,
    "postal_code"           TEXT,
    "price"                 INTEGER NOT NULL DEFAULT 0,
    "price_land"            INTEGER,
    "price_build"           INTEGER,
    "price_tax_inc"         BOOLEAN NOT NULL DEFAULT false,
    "price_per_m2"          DOUBLE PRECISION,
    "station_line1"         TEXT,
    "station_name1"         TEXT,
    "station_walk1"         INTEGER,
    "station_line2"         TEXT,
    "station_name2"         TEXT,
    "station_walk2"         INTEGER,
    "station_line3"         TEXT,
    "station_name3"         TEXT,
    "station_walk3"         INTEGER,
    "area_land_m2"          DOUBLE PRECISION,
    "area_land_tsubo"       DOUBLE PRECISION,
    "area_build_m2"         DOUBLE PRECISION,
    "area_build_tsubo"      DOUBLE PRECISION,
    "area_exclusive_m2"     DOUBLE PRECISION,
    "area_exclusive_tsubo"  DOUBLE PRECISION,
    "area_balcony_m2"       DOUBLE PRECISION,
    "rooms"                 TEXT,
    "building_year"         INTEGER,
    "building_month"        INTEGER,
    "structure"             TEXT,
    "floors_total"          INTEGER,
    "floors_basement"       INTEGER,
    "floor_unit"            INTEGER,
    "direction"             TEXT,
    "total_units"           INTEGER,
    "city_plan"             TEXT,
    "use_zone"              TEXT,
    "bcr"                   DOUBLE PRECISION,
    "far"                   DOUBLE PRECISION,
    "land_right"            TEXT,
    "land_category"         TEXT,
    "road_side"             TEXT,
    "road_width"            DOUBLE PRECISION,
    "road_type"             TEXT,
    "private_road"          BOOLEAN NOT NULL DEFAULT false,
    "setback_required"      BOOLEAN NOT NULL DEFAULT false,
    "setback_area"          DOUBLE PRECISION,
    "management_fee"        INTEGER,
    "repair_reserve"        INTEGER,
    "other_monthly_fee"     INTEGER,
    "land_lease_fee"        INTEGER,
    "fixed_asset_tax"       INTEGER,
    "city_planning_tax"     INTEGER,
    "management_type"       TEXT,
    "management_company"    TEXT,
    "delivery_timing"       TEXT,
    "delivery_status"       TEXT,
    "reins_number"          TEXT,
    "reins_registered_at"   TIMESTAMP(3),
    "ad_valid_until"        TIMESTAMP(3),
    "eq_autolock"           BOOLEAN NOT NULL DEFAULT false,
    "eq_elevator"           BOOLEAN NOT NULL DEFAULT false,
    "eq_parking"            BOOLEAN NOT NULL DEFAULT false,
    "eq_parking_fee"        INTEGER,
    "eq_bike_parking"       BOOLEAN NOT NULL DEFAULT false,
    "eq_storage"            BOOLEAN NOT NULL DEFAULT false,
    "eq_pet_ok"             BOOLEAN NOT NULL DEFAULT false,
    "eq_system_kitchen"     BOOLEAN NOT NULL DEFAULT false,
    "eq_all_electric"       BOOLEAN NOT NULL DEFAULT false,
    "eq_floor_heating"      BOOLEAN NOT NULL DEFAULT false,
    "eq_ac"                 BOOLEAN NOT NULL DEFAULT false,
    "eq_solar"              BOOLEAN NOT NULL DEFAULT false,
    "eq_home_security"      BOOLEAN NOT NULL DEFAULT false,
    "eq_walk_in_closet"     BOOLEAN NOT NULL DEFAULT false,
    "eq_2f_washroom"        BOOLEAN NOT NULL DEFAULT false,
    "eq_washlet"            BOOLEAN NOT NULL DEFAULT false,
    "eq_bathroom_dryer"     BOOLEAN NOT NULL DEFAULT false,
    "eq_tv_intercom"        BOOLEAN NOT NULL DEFAULT false,
    "eq_fiber_optic"        BOOLEAN NOT NULL DEFAULT false,
    "eq_bs_cs"              BOOLEAN NOT NULL DEFAULT false,
    "eq_gas_city"           BOOLEAN NOT NULL DEFAULT false,
    "eq_gas_prop"           BOOLEAN NOT NULL DEFAULT false,
    "eq_water_city"         BOOLEAN NOT NULL DEFAULT false,
    "eq_water_well"         BOOLEAN NOT NULL DEFAULT false,
    "eq_sewage"             BOOLEAN NOT NULL DEFAULT false,
    "eq_septic"             BOOLEAN NOT NULL DEFAULT false,
    "eq_corner"             BOOLEAN NOT NULL DEFAULT false,
    "eq_top_floor"          BOOLEAN NOT NULL DEFAULT false,
    "eq_new_interior"       BOOLEAN NOT NULL DEFAULT false,
    "eq_new_exterior"       BOOLEAN NOT NULL DEFAULT false,
    "eq_reform_kitchen"     BOOLEAN NOT NULL DEFAULT false,
    "eq_reform_bath"        BOOLEAN NOT NULL DEFAULT false,
    "published_hp"          BOOLEAN NOT NULL DEFAULT false,
    "published_members"     BOOLEAN NOT NULL DEFAULT false,
    "published_suumo"       BOOLEAN NOT NULL DEFAULT false,
    "published_athome"      BOOLEAN NOT NULL DEFAULT false,
    "published_yahoo"       BOOLEAN NOT NULL DEFAULT false,
    "published_homes"       BOOLEAN NOT NULL DEFAULT false,
    "published_at"          TIMESTAMP(3),
    "suumo_id"              TEXT,
    "athome_id"             TEXT,
    "yahoo_id"              TEXT,
    "homes_id"              TEXT,
    "compliance_checked"    BOOLEAN NOT NULL DEFAULT false,
    "compliance_checked_at" TIMESTAMP(3),
    "compliance_result"     JSONB,
    "agent_id"              TEXT,
    "store_id"              TEXT,
    "internal_memo"         TEXT,
    "source"                TEXT,
    "is_deleted"            BOOLEAN NOT NULL DEFAULT false,
    "deleted_at"            TIMESTAMP(3),
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- 既存テーブルに列が足りない場合のフォールバック（既に存在する列はスキップ）
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "transaction_type"      TEXT NOT NULL DEFAULT '仲介';
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "brokerage_type"        TEXT NOT NULL DEFAULT '専任';
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "description_suumo"     TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "description_athome"    TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "address_chiban"        TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "postal_code"           TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "price_land"            INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "price_build"           INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "price_tax_inc"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "price_per_m2"          DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "station_line1"         TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "station_name1"         TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "station_walk1"         INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "station_line2"         TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "station_name2"         TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "station_walk2"         INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "station_line3"         TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "station_name3"         TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "station_walk3"         INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "area_land_tsubo"       DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "area_build_tsubo"      DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "area_exclusive_tsubo"  DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "area_balcony_m2"       DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "floors_basement"       INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "direction"             TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "land_right"            TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "land_category"         TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "road_side"             TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "road_width"            DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "road_type"             TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "setback_required"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "setback_area"          DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "other_monthly_fee"     INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "land_lease_fee"        INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "fixed_asset_tax"       INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "city_planning_tax"     INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "management_type"       TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "management_company"    TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "delivery_status"       TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "reins_registered_at"   TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "ad_valid_until"        TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_autolock"           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_elevator"           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_parking"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_parking_fee"        INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_bike_parking"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_storage"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_pet_ok"             BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_system_kitchen"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_all_electric"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_floor_heating"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_ac"                 BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_solar"              BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_home_security"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_walk_in_closet"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_2f_washroom"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_washlet"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_bathroom_dryer"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_tv_intercom"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_fiber_optic"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_bs_cs"              BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_gas_city"           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_gas_prop"           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_water_city"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_water_well"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_sewage"             BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_septic"             BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_corner"             BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_top_floor"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_new_interior"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_new_exterior"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_reform_kitchen"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "eq_reform_bath"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "published_members"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "published_yahoo"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "published_homes"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "suumo_id"              TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "athome_id"             TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "yahoo_id"              TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "homes_id"              TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "store_id"              TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "internal_memo"         TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "source"                TEXT;

-- 旧カラム削除（存在する場合のみ）
ALTER TABLE "properties" DROP COLUMN IF EXISTS "station_line";
ALTER TABLE "properties" DROP COLUMN IF EXISTS "station_name";
ALTER TABLE "properties" DROP COLUMN IF EXISTS "station_walk";

-- UniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "properties_legacy_id_key" ON "properties"("legacy_id");

-- ----------------------------------------------------------------
-- 2. property_history テーブル
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "property_history" (
    "id"             TEXT NOT NULL,
    "property_id"    TEXT NOT NULL,
    "changed_by"     TEXT NOT NULL,
    "change_type"    TEXT NOT NULL,
    "changed_fields" JSONB NOT NULL,
    "note"           TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_history_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------
-- 3. customers テーブル
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "customers" (
    "id"                 TEXT NOT NULL,
    "crm_id"             TEXT,
    "name"               TEXT NOT NULL,
    "name_kana"          TEXT,
    "email"              TEXT,
    "phone"              TEXT,
    "budget_min"         INTEGER,
    "budget_max"         INTEGER,
    "area_preferences"   JSONB,
    "property_type_pref" TEXT,
    "rooms_pref"         TEXT,
    "area_m2_pref"       DOUBLE PRECISION,
    "status"             TEXT NOT NULL DEFAULT 'lead',
    "notes"              TEXT,
    "source"             TEXT,
    "assigned_agent_id"  TEXT,
    "last_contacted_at"  TIMESTAMP(3),
    "next_action_date"   TIMESTAMP(3),
    "next_action_note"   TEXT,
    "is_deleted"         BOOLEAN NOT NULL DEFAULT false,
    "deleted_at"         TIMESTAMP(3),
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customers_crm_id_key" ON "customers"("crm_id");

-- ----------------------------------------------------------------
-- 4. contracts テーブル
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "contracts" (
    "id"                TEXT NOT NULL,
    "property_id"       TEXT NOT NULL,
    "customer_id"       TEXT,
    "agent_id"          TEXT,
    "status"            TEXT NOT NULL DEFAULT 'draft',
    "contract_price"    INTEGER NOT NULL,
    "commission_type"   TEXT NOT NULL DEFAULT 'both',
    "commission_amount" INTEGER,
    "commission_rate"   DOUBLE PRECISION,
    "contract_date"     TIMESTAMP(3),
    "settlement_date"   TIMESTAMP(3),
    "notes"             TEXT,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);
