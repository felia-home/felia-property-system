-- =============================================================
-- 会員追客システム連携マイグレーション
-- VPS上で psql -U <user> -d <dbname> -f member_profile_migration.sql で実行
-- 実行前に必ずバックアップを取ること
-- =============================================================

-- member_profiles テーブル新規作成
CREATE TABLE IF NOT EXISTS member_profiles (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id             TEXT NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
  property_types        TEXT[],
  desired_areas         TEXT[],
  desired_lines         TEXT[],
  budget_max            INTEGER,
  desired_area_m2_min   DECIMAL(8,2),
  desired_layout        TEXT[],
  purchase_timing       TEXT,
  current_residence     TEXT,
  current_rent          INTEGER,
  lease_expiry          TEXT,
  has_property_to_sell  TEXT,
  family_structure      TEXT,
  children_ages         TEXT,
  down_payment          INTEGER,
  annual_income_range   TEXT,
  loan_preapproval      TEXT,
  purchase_motivation   TEXT,
  priority_points       TEXT[],
  other_agents          TEXT,
  remarks               TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- customers に member_id カラム追加
ALTER TABLE customers ADD COLUMN IF NOT EXISTS member_id TEXT UNIQUE REFERENCES members(id);

-- インデックス（検索高速化）
CREATE INDEX IF NOT EXISTS idx_member_profiles_member_id ON member_profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_customers_member_id ON customers(member_id);

-- 確認クエリ
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('member_profiles', 'customers')
  AND column_name IN ('id', 'member_id', 'property_types', 'budget_max')
ORDER BY table_name, column_name;
