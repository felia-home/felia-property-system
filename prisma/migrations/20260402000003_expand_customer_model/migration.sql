-- ============================================================
-- Customer モデル大幅拡充マイグレーション
-- ============================================================

-- ===== customers テーブルのカラム名変更 =====
-- crm_id → legacy_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='crm_id') THEN
    ALTER TABLE "customers" RENAME COLUMN "crm_id" TO "legacy_id";
  END IF;
END $$;

-- phone → tel
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='phone') THEN
    ALTER TABLE "customers" RENAME COLUMN "phone" TO "tel";
  END IF;
END $$;

-- budget_min → desired_budget_min
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='budget_min') THEN
    ALTER TABLE "customers" RENAME COLUMN "budget_min" TO "desired_budget_min";
  END IF;
END $$;

-- budget_max → desired_budget_max
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='budget_max') THEN
    ALTER TABLE "customers" RENAME COLUMN "budget_max" TO "desired_budget_max";
  END IF;
END $$;

-- assigned_agent_id → assigned_to
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='assigned_agent_id') THEN
    ALTER TABLE "customers" RENAME COLUMN "assigned_agent_id" TO "assigned_to";
  END IF;
END $$;

-- last_contacted_at → last_contact_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='last_contacted_at') THEN
    ALTER TABLE "customers" RENAME COLUMN "last_contacted_at" TO "last_contact_at";
  END IF;
END $$;

-- next_action_date → next_contact_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='next_action_date') THEN
    ALTER TABLE "customers" RENAME COLUMN "next_action_date" TO "next_contact_at";
  END IF;
END $$;

-- next_action_note → next_contact_note
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='next_action_note') THEN
    ALTER TABLE "customers" RENAME COLUMN "next_action_note" TO "next_contact_note";
  END IF;
END $$;

-- first_contact_at → first_inquiry_at
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='first_contact_at') THEN
    ALTER TABLE "customers" RENAME COLUMN "first_contact_at" TO "first_inquiry_at";
  END IF;
END $$;

-- notes → internal_memo
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='notes') THEN
    ALTER TABLE "customers" RENAME COLUMN "notes" TO "internal_memo";
  END IF;
END $$;

-- ===== 新規カラム追加 =====
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tel_mobile" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "line_id" TEXT;

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "prefecture" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "current_housing_type" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "current_rent" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "current_housing_note" TEXT;

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_property_type" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_areas" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_stations" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_area_min" DOUBLE PRECISION;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_area_max" DOUBLE PRECISION;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_rooms" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_floor_min" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_building_year" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_walk_max" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_move_timing" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_features" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "desired_note" TEXT;

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "finance_type" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "down_payment" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "annual_income" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "loan_preapproval" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "loan_amount" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "loan_bank" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "has_property_to_sell" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "sell_property_note" TEXT;

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "source_detail" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "first_inquiry_property" TEXT;

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "ai_analysis" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "ai_next_action" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "ai_analyzed_at" TIMESTAMP(3);

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "store_id" TEXT;

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "next_contact_at" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "next_contact_note" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_frequency" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "do_not_contact" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "unsubscribed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "is_member" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "member_registered_at" TIMESTAMP(3);

-- ステータスのデフォルト値変更（既存行には影響しない）
ALTER TABLE "customers" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- email にユニーク制約（重複がなければ追加）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename='customers' AND indexname='customers_email_key'
  ) THEN
    CREATE UNIQUE INDEX customers_email_key ON "customers"("email") WHERE "email" IS NOT NULL;
  END IF;
END $$;

-- ===== customer_activities テーブル拡充 =====
ALTER TABLE "customer_activities" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT 'OUTBOUND';
ALTER TABLE "customer_activities" ADD COLUMN IF NOT EXISTS "property_id" TEXT;
ALTER TABLE "customer_activities" ADD COLUMN IF NOT EXISTS "result" TEXT;
ALTER TABLE "customer_activities" ADD COLUMN IF NOT EXISTS "next_action" TEXT;
ALTER TABLE "customer_activities" ADD COLUMN IF NOT EXISTS "next_action_at" TIMESTAMP(3);

-- ===== family_members テーブル新規作成 =====
CREATE TABLE IF NOT EXISTS "family_members" (
  "id"            TEXT NOT NULL,
  "customer_id"   TEXT NOT NULL,
  "relation"      TEXT NOT NULL,
  "name"          TEXT,
  "name_kana"     TEXT,
  "age"           INTEGER,
  "birth_year"    INTEGER,
  "occupation"    TEXT,
  "annual_income" INTEGER,
  "note"          TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "family_members" ADD CONSTRAINT "family_members_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
