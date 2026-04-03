-- 未公開物件DB
CREATE TABLE IF NOT EXISTS "private_properties" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "property_no"      TEXT NOT NULL UNIQUE,
  "listing_type"     TEXT NOT NULL DEFAULT 'SENIN',
  "is_land"          BOOLEAN NOT NULL DEFAULT false,
  "is_house"         BOOLEAN NOT NULL DEFAULT true,
  "is_mansion"       BOOLEAN NOT NULL DEFAULT false,
  "area"             TEXT,
  "town"             TEXT,
  "price"            INTEGER,
  "area_land_m2"     DOUBLE PRECISION,
  "area_build_m2"    DOUBLE PRECISION,
  "commission"       TEXT,
  "note"             TEXT,
  "seller_name"      TEXT,
  "agent_id"         TEXT,
  "myosoku_url"      TEXT,
  "myosoku_filename" TEXT,
  "status"           TEXT NOT NULL DEFAULT 'ACTIVE',
  "confirmed_at"     TIMESTAMP(3),
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 手数料マスタ
CREATE TABLE IF NOT EXISTS "commission_masters" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "label"      TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- デフォルト手数料データ
INSERT INTO "commission_masters" ("id", "label", "value", "sort_order")
VALUES
  ('cm_default_1', '3%（税込）', '3%（税込）', 1),
  ('cm_default_2', '6%', '6%', 2),
  ('cm_default_3', '分かれ', '分かれ', 3),
  ('cm_default_4', '確認要', '確認要', 4)
ON CONFLICT DO NOTHING;

-- updated_at 自動更新トリガー（PostgreSQLでは不要、アプリ側で管理）
